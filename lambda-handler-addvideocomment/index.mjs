import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });
const TABLE_NAME = "Comments";

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    return JSON.parse(Buffer.from(base64Url, 'base64').toString('utf-8'));
  } catch (err) {
    console.error("Failed to decode JWT:", err);
    return {};
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  // Handle CORS
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: ""
    };
  }

  if (method === "POST") {
    const token = event.headers?.authorization || event.headers?.Authorization || "";
    if (!token.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const decoded = decodeJWT(token.replace("Bearer ", ""));
    const username = decoded.preferred_username || decoded.email || "guest";

    const body = JSON.parse(event.body || "{}");
    const { topicId, content } = body;

    if (!topicId || !content) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Missing topicId or content" })
      };
    }

    const timestamp = new Date().toISOString();

    await ddb.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        topicId: { S: topicId },
        timestamp: { S: timestamp },
        commentId: { S: crypto.randomUUID() },
        username: { S: username },
        content: { S: content },
        isDeleted: { BOOL: false }
      }
    }));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Comment posted" })
    };
  }

  if (method === "GET") {
    const topicId = event.queryStringParameters?.topicId;
    if (!topicId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Missing topicId in query" })
      };
    }

    const res = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "topicId = :t",
      ExpressionAttributeValues: {
        ":t": { S: topicId }
      },
      ScanIndexForward: true
    }));

    const comments = res.Items.filter(item => !item.isDeleted?.BOOL).map(item => ({
      commentId: item.commentId.S,
      username: item.username.S,
      content: item.content.S,
      timestamp: item.timestamp.S
    }));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(comments)
    };
  }

  if (method === "DELETE") {
    const token = event.headers?.authorization || event.headers?.Authorization || "";
    if (!token.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const decoded = decodeJWT(token.replace("Bearer ", ""));
    const username = decoded.preferred_username || decoded.email || "guest";

    const body = JSON.parse(event.body || "{}");
    const { topicId, timestamp } = body;

    if (!topicId || !timestamp) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Missing topicId or timestamp" })
      };
    }

    try {
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          topicId: { S: topicId },
          timestamp: { S: timestamp }
        },
        UpdateExpression: "SET isDeleted = :true",
        ConditionExpression: "username = :u",
        ExpressionAttributeValues: {
          ":true": { BOOL: true },
          ":u": { S: username }
        }
      }));

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "Comment deleted" })
      };
    } catch (err) {
      return {
        statusCode: 403,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Delete failed or unauthorized", detail: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "Method not allowed" })
  };
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
  };
}
