import {
  DynamoDBClient,
  UpdateItemCommand,
  QueryCommand,
  ScanCommand
} from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });
const PRODUCTS_TABLE = "Products";
const BIDS_TABLE = "Bids";
const ORDERS_TABLE = "Orders";

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
    const body = JSON.parse(event.body || "{}");
    const { productId } = body;

    if (!productId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing productId" })
      };
    }

    // Step 1: Close bidding
    await ddb.send(new UpdateItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId: { S: productId } },
      UpdateExpression: "SET isBidOpen = :false",
      ExpressionAttributeValues: { ":false": { BOOL: false } }
    }));

    // Step 2: Get all bids for the product
    const allBidsRes = await ddb.send(new QueryCommand({
      TableName: BIDS_TABLE,
      KeyConditionExpression: "productId = :pid",
      ExpressionAttributeValues: { ":pid": { S: productId } },
      ScanIndexForward: false // Get highest bid first
    }));

    const allBids = allBidsRes.Items || [];
    const topBid = allBids[0];

    if (!topBid) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No bids found for this product." })
      };
    }

    const winningUsername = topBid.username?.S;
    const winningBidAmount = topBid.bidAmount?.N;

    // Step 3: Get all orders for the product
    const ordersRes = await ddb.send(new ScanCommand({
      TableName: ORDERS_TABLE,
      FilterExpression: "productId = :pid",
      ExpressionAttributeValues: {
        ":pid": { S: productId }
      }
    }));

    // Step 4: Update each order's status based on matching username AND bidAmount
    for (const order of ordersRes.Items || []) {
      const isWinner =
        order.username?.S === winningUsername &&
        order.bidAmount?.N === winningBidAmount;

      const newStatus = isWinner ? "Pending Payment" : "Refunding";

      await ddb.send(new UpdateItemCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId: { S: order.orderId.S } },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": { S: newStatus } }
      }));
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "✅ Bidding closed, orders updated." })
    };

  } catch (err) {
    console.error("❌ StopBid Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to complete stopBid flow", detail: err.message })
    };
  }
};
