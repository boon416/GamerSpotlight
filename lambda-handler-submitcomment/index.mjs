import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST"
};

export const handler = async (event) => {
  try {
    console.log("🔍 Raw event.body:", event.body);
    console.log("🔍 Raw event.headers:", event.headers);

    if (!event.body) {
      throw new Error("Empty request body.");
    }

    const { postId, timestamp, text } = JSON.parse(event.body);

    if (!postId || !timestamp || !text) {
      throw new Error("Missing postId, timestamp or text");
    }

    const rawHeader = event.headers.Authorization || event.headers.authorization;
    if (!rawHeader || !rawHeader.startsWith("Bearer ")) {
      throw new Error("Missing or invalid Authorization header");
    }

    const token = rawHeader.split(" ")[1];
    const jwtPayload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    const username = jwtPayload["preferred_username"] || jwtPayload["email"] || "guest";

    const comment = {
      username,
      text,
      timestamp: new Date().toISOString()
    };

    const updateCmd = new UpdateCommand({
      TableName: "CommunityPosts",
      Key: {
        postId: postId,
        timestamp: timestamp
      },
      UpdateExpression: "SET comments = list_append(if_not_exists(comments, :emptyList), :newComment)",
      ExpressionAttributeValues: {
        ":newComment": [comment],
        ":emptyList": []
      }
    });

    console.log("🧩 Sending update for key:", { postId, timestamp });
    await docClient.send(updateCmd);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Comment added", comment })
    };

  } catch (err) {
    console.error("❌ Error submitting comment:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || "Unknown error" })
    };
  }
};
