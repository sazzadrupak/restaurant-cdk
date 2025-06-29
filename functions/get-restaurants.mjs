import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const defaultResults = parseInt(process.env.default_results, 10);
const tableName = process.env.table_name;

const getRestaurants = async (count) => {
  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
    })
  );
  console.log(`found ${resp.Items.length} restaurants`);
  return resp.Items;
};

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  try {
    const restaurants = await getRestaurants(defaultResults);
    return {
      statusCode: 200,
      body: JSON.stringify(restaurants),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch restaurants' }),
    };
  }
};
