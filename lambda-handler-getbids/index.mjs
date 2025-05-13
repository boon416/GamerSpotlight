import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });
const TABLE_NAME = "Bids";

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const productId = event.queryStringParameters?.productId;
    if (!productId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing productId" }),
      };
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "productId = :pid",
        ExpressionAttributeValues: {
          ":pid": { S: productId },
        },
        ScanIndexForward: false, // sort descending by timestamp
      })
    );

    const bids = (result.Items || []).map((item) => ({
      bidId: item.bidId?.S || "",
      username: item.username?.S || "Unknown",
      amount: item.bidAmount?.N || "0",
      timestamp: item.timestamp?.S || "",
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ bids }),
    };
  } catch (err) {
    console.error("❌ Get Bids Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Failed to fetch bids",
        detail: err.message,
      }),
    };
  }
};
