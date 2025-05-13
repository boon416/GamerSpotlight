import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });
const PRODUCTS_TABLE = "Products";
const ORDERS_TABLE = "Orders";

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const payload = Buffer.from(base64Url, 'base64').toString();
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let username = "guest";
    if (token) {
      const decoded = decodeToken(token);
      username = decoded.preferred_username || decoded.email || "guest";
    }

    const body = JSON.parse(event.body || "{}");
    const { productId } = body;

    if (!productId || !username) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing productId or username" })
      };
    }

    const productRes = await ddb.send(new GetItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId: { S: productId } }
    }));

    const product = productRes.Item;
    if (!product) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Product not found" })
      };
    }

    // ❌ Prevent placing order on own product
    if (product.username?.S === username) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "You cannot place an order on your own product." })
      };
    }

    const price = product.price?.N || "0";
    const orderId = `order_${Date.now()}`;

    await ddb.send(new PutItemCommand({
      TableName: ORDERS_TABLE,
      Item: {
        orderId: { S: orderId },
        productId: { S: productId },
        productName: { S: product.name?.S || "Unknown Product" },
        bidAmount: { N: price },
        username: { S: username },
        status: { S: "Pending Payment" },
        createdAt: { S: new Date().toISOString() }
      }
    }));

    await ddb.send(new UpdateItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId: { S: productId } },
      UpdateExpression: "SET isBidOpen = :false",
      ExpressionAttributeValues: {
        ":false": { BOOL: false }
      }
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Order placed successfully", orderId })
    };

  } catch (err) {
    console.error("❌ PlaceOrder Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to place order", detail: err.message })
    };
  }
};
