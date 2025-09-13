import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { wrapWithMetrics } from '../lib/wrapper.mjs';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const { service_name, ssm_stage_name } = process.env;
const tableName = process.env.restaurants_table;

const metrics = new Metrics({
  namespace: 'RestaurantService',
  serviceName: service_name,
});
const logger = new Logger({
  serviceName: service_name,
  logLevel: 'INFO',
});

const getRestaurants = async (count) => {
  const startTime = Date.now();

  try {
    const resp = await dynamodb.send(
      new ScanCommand({
        TableName: tableName,
        Limit: count,
      })
    );

    // Record custom metrics
    const duration = Date.now() - startTime;
    metrics.addMetric(
      'GetRestaurantsDuration',
      MetricUnit.Milliseconds,
      duration
    );
    metrics.addMetric(
      'RestaurantsReturned',
      MetricUnit.Count,
      resp.Items.length
    );
    metrics.addMetric('GetRestaurantsSuccess', MetricUnit.Count, 1);

    // Add metadata to metrics
    metrics.addMetadata('requestedCount', count);
    metrics.addMetadata('actualCount', resp.Items.length);

    logger.info('Restaurants fetched successfully', {
      count: resp.Items.length,
      duration,
    });

    return resp.Items;
  } catch (error) {
    metrics.addMetric('GetRestaurantsError', MetricUnit.Count, 1);
    logger.error('Error fetching restaurants', error);
    throw error;
  }
};

// Middy is a middleware engine that lets you run middleware (basically, bits of logic before and after your handler code runs). To use it you have to wrap the handler code
// returns a wrapped function, which exposes a .use function, that lets you chain middlewares that you want to apply
export const handler = wrapWithMetrics(async (event, context) => {
  // Record invocation metric
  metrics.addMetric('GetRestaurantsInvocation', MetricUnit.Count, 1);

  // Add dimensions to all metrics in this invocation
  metrics.addDimension('Stage', ssm_stage_name || 'unknown');
  metrics.addDimension('Operation', 'GetRestaurants');

  const restaurants = await getRestaurants(
    context.serviceQuotas.getRestaurants.defaultResults
  );
  const response = {
    statusCode: 200,
    headers: {
      // CloudFront respects these headers when you use CachePolicy.CACHING_OPTIMIZED or custom policies
      'Cache-Control': 'public, max-age=300', // 5 minutes
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(restaurants),
  };

  return response;
}, metrics);
