import { parse } from 'aws-multipart-parser';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({ region: 'ap-southeast-1' });
const ddb = new DynamoDBClient({ region: 'ap-southeast-1' });

const BUCKET_NAME = 'gamer-spotlight-uploads';
const TABLE_NAME = 'CommunityPosts';

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const parsed = parse(event, true);
    const { topic, content, file } = parsed;

    // ✅ 从 Authorization header 解码 JWT 拿用户名（REST API 需要手动）
    const rawHeader = event.headers.Authorization || event.headers.authorization;
    if (!rawHeader || !rawHeader.startsWith("Bearer ")) {
      throw new Error("Missing or invalid Authorization header");
    }
    const token = rawHeader.split(" ")[1];
    const jwtPayload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    const username = jwtPayload["preferred_username"] || jwtPayload["email"] || "guest";

    const postId = uuidv4();
    const timestamp = new Date().toISOString();

    let fileUrl = '';
    if (file && file.content && file.filename) {
      const s3Key = `uploads/${postId}_${file.filename}`;
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: file.content,
        ContentType: file.contentType,
      });

      await s3.send(uploadCommand);
      fileUrl = `https://${BUCKET_NAME}.s3.ap-southeast-1.amazonaws.com/${s3Key}`;
    }

    const dbCommand = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        postId: { S: postId },
        topic: { S: topic || '' },
        content: { S: content || '' },
        username: { S: username },
        timestamp: { S: timestamp },
        fileUrl: { S: fileUrl },
      },
    });

    await ddb.send(dbCommand);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        message: 'Upload and save success',
        data: { postId, topic, content, username, fileUrl },
      }),
    };
  } catch (err) {
    console.error('❌ Error handling upload:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Upload failed', detail: err.message }),
    };
  }
};
