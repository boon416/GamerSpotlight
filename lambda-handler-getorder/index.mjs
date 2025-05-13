import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { jwtDecode } from "jwt-decode";

const ddbClient = new DynamoDBClient({ region: "ap-southeast-1" });
const TABLE_NAME = "Orders";
const INDEX_NAME = "UsernameIndex";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;

  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const token = event.headers?.Authorization?.replace("Bearer ", "");
    if (!token) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const decoded = jwtDecode(token);
    const username = decoded.preferred_username || decoded.email;

    if (!username) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid token or username not found" })
      };
    }

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: INDEX_NAME,
      KeyConditionExpression: "username = :u",
      ExpressionAttributeValues: {
        ":u": { S: username }
      }
    });

    const result = await ddbClient.send(command);

    // 🔥 解包结果，简化前端处理
    const orders = result.Items.map(item => unmarshall(item));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(orders)
    };

  } catch (err) {
    console.error("❌ Lambda error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: err.message })
    };
  }
};
