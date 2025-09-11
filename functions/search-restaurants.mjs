import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { wrap } from '../lib/wrapper.mjs';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const tableName = process.env.restaurants_table;

const findRestaurantsByTheme = async (theme, count) => {
  console.log(
    `finding (up to ${count}) restaurants with the theme ${theme}...`
  );

  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
      FilterExpression: 'contains(themes, :theme)',
      ExpressionAttributeValues: { ':theme': theme },
    })
  );
  return resp.Items;
};

export const handler = wrap(async (event, context) => {
  const req = JSON.parse(event.body);
  const theme = req.theme;
  const restaurants = await findRestaurantsByTheme(
    theme,
    context.serviceQuotas.searchRestaurants.defaultResults
  );
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };

  return response;
});
