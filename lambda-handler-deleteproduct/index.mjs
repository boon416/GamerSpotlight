import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const REGION = "ap-southeast-1";
const TABLE_NAME = "Products";
const ddb = new DynamoDBClient({ region: REGION });

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;

  if (method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body);
    const productId = body.productId;

    if (!productId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing productId" })
      };
    }

    const command = new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: { productId: { S: productId } }
    });

    await ddb.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Product deleted successfully" })
    };
  } catch (err) {
    console.error("❌ Lambda error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Internal server error" })
    };
  }
};
