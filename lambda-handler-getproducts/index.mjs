import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });
const TABLE_NAME = "Products";

export const handler = async () => {
  try {
    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));

    console.log("📦 Raw items from DynamoDB:", JSON.stringify(data.Items));

    const items = (data.Items || []).map(item => ({
      productId: item.productId?.S || "",
      name: item.name?.S || "",
      price: parseFloat(item.price?.N || "0"),
      tags: item.tags?.S || "",
      description: item.description?.S || "",
      isBiddable: item.isBiddable?.BOOL,
      isBidOpen: item.isBidOpen?.BOOL ?? true, // ✅ 加入 isBidOpen（默认 false）
      coverUrl: item.coverUrl?.S || "",
      username: item.username?.S || "unknown",
      timestamp: item.timestamp?.S || ""
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      },
      body: JSON.stringify(items)
    };
  } catch (err) {
    console.error("❌ Error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "读取失败", detail: err.message })
    };
  }
};
