import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const defaultResults = parseInt(process.env.DEFAULT_RESULTS || '8', 10);
const tableName = process.env.restaurants_table || 'Restaurants';

const findRestaurantsByTheme = async (theme, count) => {
  console.log(`finding (up to ${count}) restaurants with theme: ${theme}...`);

  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
      FilterExpression: 'contains(theme, :theme)',
      ExpressionAttributeValues: {
        ':theme': theme,
      },
    })
  );

  console.log(`found ${resp.Items.length} restaurants with theme: ${theme}`);
  return resp.Items;
};

export const handler = async (event, contexxt) => {
  const req = JSON.parse(event.body);
  const theme = req.theme || 'default';
  const restaurants = await findRestaurantsByTheme(theme, defaultResults);

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      restaurants,
    }),
  };

  return response;
};
