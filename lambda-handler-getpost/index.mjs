// === Lambda index.mjs ===
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({ region: 'ap-southeast-1' });
const TABLE_NAME = 'CommunityPosts';

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const command = new ScanCommand({ TableName: TABLE_NAME });
    const result = await ddb.send(command);

    const posts = result.Items.map(item => {
      // 💬 解析 comment 数组
      let comments = [];
      if (item.comments && item.comments.L) {
        comments = item.comments.L.map(c => ({
          username: c.M?.username?.S || '',
          text: c.M?.text?.S || '',
          timestamp: c.M?.timestamp?.S || ''
        }));
      }

      return {
        postId: item.postId?.S || '',
        topic: item.topic?.S || '',
        content: item.content?.S || '',
        username: item.username?.S || '',
        timestamp: item.timestamp?.S || item.createdAt?.S || '',
        fileUrl: item.fileUrl?.S || '',
        comments // 已经处理好了，赞！
      };      
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: JSON.stringify({ posts }),
    };

  } catch (err) {
    console.error("❌ Failed to get posts:", err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get posts', detail: err.message }),
    };
  }
};
