import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { jwtDecode } from "jwt-decode";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });
const TABLE_NAME = "Bids";
const PRODUCTS_TABLE = "Products";
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
    const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let username = "guest";
    if (token) {
      const decoded = jwtDecode(token);
      username = decoded.preferred_username || decoded.email || "guest";
    }

    const body = JSON.parse(event.body || "{}");
    const { productId, bidAmount } = body;

    if (!productId || !bidAmount) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing productId or bidAmount" })
      };
    }

    // 🛒 Get full product details
    const productRes = await ddb.send(new GetItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId: { S: productId } }
    }));

    const product = productRes.Item;
    const isOpen = product?.isBidOpen?.BOOL !== false;

    if (!product || !isOpen) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Bidding for this product has ended.", isBidOpen: false })
      };
    }

    const currentHighest = parseFloat(product?.highestBid?.N || "0");
    const basePrice = parseFloat(product?.price?.N || "0");
    const userBid = parseFloat(bidAmount);

    if (userBid < basePrice) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Your bid must be at least equal to the base price.", basePrice })
      };
    }

    if (userBid <= currentHighest) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Your bid must be higher than the current price or highest bid.", currentHighest })
      };
    }

    const timestamp = new Date().toISOString();
    const bidId = uuidv4();
    const productName = product.name?.S || "Unknown Product";

    // ✅ Save bid with productName
    await ddb.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        productId: { S: productId },
        timestamp: { S: timestamp },
        bidId: { S: bidId },
        bidAmount: { N: bidAmount.toString() },
        username: { S: username },
        productName: { S: productName } // ✅ added
      }
    }));

    // ✅ Save order with productName
    await ddb.send(new PutItemCommand({
      TableName: ORDERS_TABLE,
      Item: {
        orderId: { S: uuidv4() },
        productId: { S: productId },
        productName: { S: productName }, // ✅ added
        username: { S: username },
        bidAmount: { N: bidAmount.toString() },
        status: { S: "bidding" },
        createdAt: { S: timestamp }
      }
    }));

    // ✅ Update highest bid info in Products table
    await ddb.send(new UpdateItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId: { S: productId } },
      UpdateExpression: "SET highestBid = :hb, highestBidder = :user",
      ExpressionAttributeValues: {
        ":hb": { N: bidAmount.toString() },
        ":user": { S: username }
      }
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Bid placed successfully", isBidOpen: true })
    };

  } catch (err) {
    console.error("❌ PlaceBid Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to place bid", detail: err.message })
    };
  }
};
