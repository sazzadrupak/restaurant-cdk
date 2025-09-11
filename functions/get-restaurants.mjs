import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import middy from '@middy/core';
import ssm from '@middy/ssm';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const { service_name, ssm_stage_name } = process.env;
const tableName = process.env.restaurants_table;

const getRestaurants = async (count) => {
  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
    })
  );
  return resp.Items;
};

// Middy is a middleware engine that lets you run middleware (basically, bits of logic before and after your handler code runs). To use it you have to wrap the handler code
// returns a wrapped function, which exposes a .use function, that lets you chain middlewares that you want to apply
export const handler = middy(async (event, context) => {
  const restaurants = await getRestaurants(
    context.serviceQuotas.getRestaurants.defaultResults
  );
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };

  return response;
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 mins
    setToContext: true,
    fetchData: {
      serviceQuotas: `/${service_name}/${ssm_stage_name}/serviceQuotas`,
    },
  })
);
