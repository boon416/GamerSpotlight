import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: ""
      };
    }

    const { postId, timestamp, topic, content } = JSON.parse(event.body);

    if (!postId || !timestamp || !topic || !content) {
      throw new Error("Missing fields: postId, timestamp, topic, or content");
    }

    const rawHeader = event.headers.Authorization || event.headers.authorization;
    if (!rawHeader?.startsWith("Bearer ")) throw new Error("Missing or invalid Authorization header");

    const token = rawHeader.split(" ")[1];
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    const username = payload["preferred_username"] || payload["email"];

    const command = new UpdateCommand({
      TableName: "CommunityPosts",
      Key: { postId, timestamp },
      UpdateExpression: "SET topic = :topic, content = :content",
      ConditionExpression: "username = :user",
      ExpressionAttributeValues: {
        ":topic": topic,
        ":content": content,
        ":user": username
      }
    });

    await docClient.send(command);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Post updated." })
    };

  } catch (err) {
    console.error("❌ Edit Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message || "Internal error" })
    };
  }
};
