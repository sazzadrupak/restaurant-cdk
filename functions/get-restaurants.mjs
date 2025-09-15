import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { METRICS } from '../lib/metrics-constants.mjs';
import {
  errorResponse,
  getRestaurantsResponseSchema,
  successResponse,
  validateRestaurantArray,
} from '../lib/schemas/index.mjs';
import { combinedWrapper } from '../lib/wrapper.mjs';

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
      METRICS.GET_RESTAURANTS.DURATION,
      MetricUnit.Milliseconds,
      duration
    );
    metrics.addMetric(
      METRICS.GET_RESTAURANTS.RETURNED,
      MetricUnit.Count,
      resp.Items.length
    );
    metrics.addMetric(METRICS.GET_RESTAURANTS.SUCCESS, MetricUnit.Count, 1);

    // Add metadata to metrics
    metrics.addMetadata('requestedCount', count);
    metrics.addMetadata('actualCount', resp.Items.length);

    logger.info('Restaurants fetched successfully', {
      count: resp.Items.length,
      duration,
    });

    return resp.Items;
  } catch (error) {
    metrics.addMetric(METRICS.GET_RESTAURANTS.ERROR, MetricUnit.Count, 1);
    logger.error('Error fetching restaurants', error);
    throw error;
  }
};

// Middy is a middleware engine that lets you run middleware (basically, bits of logic before and after your handler code runs). To use it you have to wrap the handler code
// returns a wrapped function, which exposes a .use function, that lets you chain middlewares that you want to apply
export const handler = combinedWrapper(
  async (event, context) => {
    // Record invocation metric
    metrics.addMetric(METRICS.GET_RESTAURANTS.INVOCATION, MetricUnit.Count, 1);

    // Add dimensions to all metrics in this invocation
    metrics.addDimension('Stage', ssm_stage_name || 'unknown');
    metrics.addDimension('Operation', 'GetRestaurants');

    const restaurants = await getRestaurants(
      context.serviceQuotas.getRestaurants.defaultResults
    );

    // Validate restaurant data
    const validation = validateRestaurantArray(restaurants);
    if (!validation.isValid) {
      logger.error('Restaurant data validation failed', {
        errors: validation.errors,
        restaurants,
      });

      return errorResponse(500, 'Internal server error', {
        errors: validation.errors,
      });
    }

    return successResponse(restaurants, {
      // CloudFront respects these headers when you use CachePolicy.CACHING_OPTIMIZED or custom policies
      'Cache-Control': 'public, max-age=300',
    });
  },
  {
    metrics,
    responseSchema: getRestaurantsResponseSchema,
  }
);
