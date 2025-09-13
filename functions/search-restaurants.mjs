import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { wrapWithMetrics } from '../lib/wrapper.mjs';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const { service_name, ssm_stage_name } = process.env;
const tableName = process.env.restaurants_table;

// Initialize metrics and logger
const metrics = new Metrics({
  namespace: 'RestaurantService',
  serviceName: service_name,
});

const logger = new Logger({
  serviceName: service_name,
  logLevel: 'INFO',
});

const findRestaurantsByTheme = async (theme, count) => {
  const startTime = Date.now();

  try {
    const resp = await dynamodb.send(
      new ScanCommand({
        TableName: tableName,
        Limit: count,
        FilterExpression: 'contains(themes, :theme)',
        ExpressionAttributeValues: { ':theme': theme },
      })
    );

    // Record custom metrics
    const duration = Date.now() - startTime;
    metrics.addMetric(
      'SearchRestaurantsDuration',
      MetricUnit.Milliseconds,
      duration
    );
    metrics.addMetric(
      'SearchRestaurantsResults',
      MetricUnit.Count,
      resp.Items.length
    );
    metrics.addMetric('SearchRestaurantsSuccess', MetricUnit.Count, 1);

    // Track popular themes
    metrics.addMetric(`ThemeSearched_${theme}`, MetricUnit.Count, 1);

    // Add metadata
    metrics.addMetadata('theme', theme);
    metrics.addMetadata('requestedCount', count);
    metrics.addMetadata('actualCount', resp.Items.length);

    logger.info('Restaurant search completed', {
      theme,
      resultsCount: resp.Items.length,
      duration,
    });

    return resp.Items;
  } catch (error) {
    metrics.addMetric('SearchRestaurantsError', MetricUnit.Count, 1);
    logger.error('Error searching restaurants', { error, theme });
    throw error;
  }
};

export const handler = wrapWithMetrics(async (event, context) => {
  try {
    // Record invocation metric
    metrics.addMetric('SearchRestaurantsInvocation', MetricUnit.Count, 1);

    // Add dimensions to all metrics in this invocation
    metrics.addDimension('Stage', ssm_stage_name || 'unknown');
    metrics.addDimension('Operation', 'SearchRestaurants');
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

    // Track zero results (might indicate issues)
    if (restaurants.length === 0) {
      metrics.addMetric('SearchRestaurantsNoResults', MetricUnit.Count, 1);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(restaurants),
    };
  } catch (error) {
    console.error('Handler error:', error);
    metrics.addMetric('SearchRestaurantsHandlerError', MetricUnit.Count, 1);

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
}, metrics);
