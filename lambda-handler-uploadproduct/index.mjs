import { parse } from 'aws-multipart-parser';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({ region: 'ap-southeast-1' });
const ddb = new DynamoDBClient({ region: 'ap-southeast-1' });

const BUCKET_NAME = 'bidding-product-uploads';
const TABLE_NAME = 'Products';

// 解码 JWT Token（不依赖 jwt-decode）
function extractUsernameFromJWT(authHeader) {
  try {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded.preferred_username || decoded.email || 'guest';
  } catch (err) {
    console.warn("⚠️ Failed to extract username from JWT:", err.message);
    return 'guest';
  }
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
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
    // Step 1: Get username from token
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const username = extractUsernameFromJWT(authHeader);

    // Step 2: Parse form-data
    const parsed = parse(event, true);
    const { name, description, price, tags, isBiddable, file0 } = parsed;

    // Step 3: Upload to S3
    let fileUrl = '';
    if (file0 && file0.content && file0.filename) {
      const s3Key = `products/${uuidv4()}_${file0.filename}`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: file0.content,
        ContentType: file0.contentType,
      }));
      fileUrl = `https://${BUCKET_NAME}.s3.ap-southeast-1.amazonaws.com/${s3Key}`;
    }

    // Step 4: Store in DynamoDB
    const productId = uuidv4();
    await ddb.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        productId: { S: productId },
        name: { S: name },
        description: { S: description },
        price: { N: price },
        tags: { S: tags || '' },
        isBiddable: { BOOL: isBiddable === 'on' || isBiddable === true },
        coverUrl: { S: fileUrl },
        username: { S: username },
        timestamp: { S: new Date().toISOString() }
      }
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Upload success', fileUrl })
    };
  } catch (err) {
    console.error('❌ Upload Error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Upload failed', detail: err.message }),
    };
  }
};
