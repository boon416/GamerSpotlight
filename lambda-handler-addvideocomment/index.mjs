import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import { jwtDecode } from "jwt-decode";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });
const TABLE_NAME = "Comments";

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

    const decoded = jwtDecode(token.replace("Bearer ", ""));
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
        content: { S: content }
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

    const comments = res.Items.map(item => ({
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
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
}
