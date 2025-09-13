import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { wrap } from '../lib/wrapper.mjs';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const tableName = process.env.restaurants_table;

const findRestaurantsByTheme = async (theme, count) => {
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
  try {
    const theme = event.body?.theme;

    // if (!theme) {
    //   return {
    //     statusCode: 400,
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ error: 'Theme is required' }),
    //   };
    // }

    const defaultCount =
      context.serviceQuotas?.searchRestaurants?.defaultResults || 8;
    const restaurants = await findRestaurantsByTheme(theme, defaultCount);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(restaurants),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      }),
    };
  }
});
