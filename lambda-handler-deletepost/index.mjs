import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { postId, timestamp } = body;

    const command = new DeleteItemCommand({
      TableName: "CommunityPosts",
      Key: {
        postId: { S: postId },
        timestamp: { S: timestamp }
      }
    });

    await ddb.send(command);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ message: "Post deleted" }),
    };
  } catch (err) {
    console.error("❌ Failed to delete post:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "Failed to delete post", detail: err.message }),
    };
  }
};
