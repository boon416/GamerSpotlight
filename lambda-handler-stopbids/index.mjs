import {
  DynamoDBClient,
  UpdateItemCommand,
  QueryCommand,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand
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

    // Step 1: Stop bidding
    await ddb.send(new UpdateItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId: { S: productId } },
      UpdateExpression: "SET isBidOpen = :false",
      ExpressionAttributeValues: { ":false": { BOOL: false } }
    }));

    // Step 2: Get all bids
    const allBidsRes = await ddb.send(new QueryCommand({
      TableName: BIDS_TABLE,
      KeyConditionExpression: "productId = :pid",
      ExpressionAttributeValues: { ":pid": { S: productId } },
      ScanIndexForward: false
    }));

    const allBids = allBidsRes.Items || [];
    const topBid = allBids[0];

    // Step 3: Write refunding orders for lower bids
    for (const bid of allBids) {
      const isWinner = bid.bidId?.S === topBid?.bidId?.S;
      if (!isWinner) {
        const refundOrderId = `order_refund_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await ddb.send(new PutItemCommand({
          TableName: ORDERS_TABLE,
          Item: {
            orderId: { S: refundOrderId },
            productId: { S: productId },
            bidAmount: { N: bid.bidAmount?.N || "0" },
            username: { S: bid.username?.S || "unknown" },
            status: { S: "Refunding" },
            createdAt: { S: new Date().toISOString() }
          }
        }));
      }
    }

    // Step 4: Delete winning bidder's order from Orders table
    const winnerOrderId = `order_${topBid.timestamp?.S}`;
    await ddb.send(new DeleteItemCommand({
      TableName: ORDERS_TABLE,
      Key: { orderId: { S: winnerOrderId } }
    }));

    // Step 5: Delete product from Products table
    await ddb.send(new DeleteItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId: { S: productId } }
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Bidding stopped, refunds initiated, product removed." })
    };
  } catch (err) {
    console.error("❌ StopBid Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to complete bidding stop flow", detail: err.message })
    };
  }
};
