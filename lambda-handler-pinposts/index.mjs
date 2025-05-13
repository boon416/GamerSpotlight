import {
    DynamoDBClient,
    PutItemCommand,
    DeleteItemCommand,
    QueryCommand
  } from "@aws-sdk/client-dynamodb";
  
  const REGION = "ap-southeast-1";
  const TABLE_NAME = "PinnedPosts";
  const ddbClient = new DynamoDBClient({ region: REGION });
  
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
  };
  
  export const handler = async (event) => {
    const method = event.httpMethod || event.requestContext?.http?.method;
  
    // 🔍 Debug auth claims
    const claims = event.requestContext?.authorizer?.claims;
    const userId = claims?.["cognito:username"] || claims?.["username"];
  
    try {
      // Preflight
      if (method === "OPTIONS") {
        return {
          statusCode: 200,
          headers: defaultHeaders,
          body: JSON.stringify({ message: "CORS OK" })
        };
      }
  
      if (!userId) {
        console.error("❌ No Cognito username found in event", event.requestContext?.authorizer);
        return {
          statusCode: 401,
          headers: defaultHeaders,
          body: JSON.stringify({ error: "Unauthorized: missing Cognito username" })
        };
      }
  
      if (method === "POST") {
        const { postId } = JSON.parse(event.body || "{}");
        if (!postId) throw new Error("Missing postId");
  
        const cmd = new PutItemCommand({
          TableName: TABLE_NAME,
          Item: {
            userId: { S: userId },
            postId: { S: postId },
            timestamp: { S: new Date().toISOString() }
          }
        });
        await ddbClient.send(cmd);
  
        return {
          statusCode: 200,
          headers: defaultHeaders,
          body: JSON.stringify({ message: "Pinned" })
        };
      }
  
      if (method === "DELETE") {
        const { postId } = JSON.parse(event.body || "{}");
        if (!postId) throw new Error("Missing postId");
  
        const cmd = new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: {
            userId: { S: userId },
            postId: { S: postId }
          }
        });
        await ddbClient.send(cmd);
  
        return {
          statusCode: 200,
          headers: defaultHeaders,
          body: JSON.stringify({ message: "Unpinned" })
        };
      }
  
      if (method === "GET") {
        const cmd = new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "userId = :uid",
          ExpressionAttributeValues: {
            ":uid": { S: userId }
          }
        });
        const result = await ddbClient.send(cmd);
        const pinned = (result.Items || []).map(item => item.postId.S);
  
        return {
          statusCode: 200,
          headers: defaultHeaders,
          body: JSON.stringify({ pinned })
        };
      }
  
      return {
        statusCode: 405,
        headers: defaultHeaders,
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
  
    } catch (err) {
      console.error("❌ Lambda error:", err);
      return {
        statusCode: 500,
        headers: defaultHeaders,
        body: JSON.stringify({ error: "Internal Server Error", detail: err.message })
      };
    }
  };
  