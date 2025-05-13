import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const { postId, timestamp, commentTimestamp } = JSON.parse(event.body);

    const rawHeader = event.headers.Authorization || event.headers.authorization;
    const token = rawHeader?.split(" ")[1];
    const jwtPayload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    const username = jwtPayload["preferred_username"] || jwtPayload["email"] || "guest";

    // 1️⃣ 获取原本的 comments
    const getCmd = new GetCommand({
      TableName: "CommunityPosts",
      Key: { postId, timestamp }
    });
    const result = await docClient.send(getCmd);
    const item = result.Item;

    if (!item || !item.comments) {
      throw new Error("No comments found for this post");
    }

    // 2️⃣ 删除匹配 timestamp 的留言（只允许本人删）
    const updatedComments = item.comments.filter(c => {
      return c.timestamp !== commentTimestamp || c.username !== username;
    });

    // 3️⃣ 更新
    const updateCmd = new UpdateCommand({
      TableName: "CommunityPosts",
      Key: { postId, timestamp },
      UpdateExpression: "SET comments = :updatedComments",
      ExpressionAttributeValues: {
        ":updatedComments": updatedComments
      }
    });

    await docClient.send(updateCmd);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: "Comment deleted" })
    };

  } catch (err) {
    console.error("❌ Error deleting comment:", err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message || "Unknown error" })
    };
  }
};
