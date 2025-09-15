import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { Chance } from 'chance';

import { METRICS } from '../lib/metrics-constants.mjs';
import { orderResponseSchema, successResponse } from '../lib/schemas/index.mjs';
import { combinedWrapperWithoutSSM } from '../lib/wrapper.mjs';

const { service_name, ssm_stage_name } = process.env;
const logger = new Logger({ serviceName: service_name });

const metrics = new Metrics({
  namespace: 'RestaurantService',
  serviceName: service_name,
});

const clientEventBridge = new EventBridgeClient();
const chance = new Chance();
const busName = process.env.bus_name || 'order-event-bus';

export const handler = combinedWrapperWithoutSSM(
  async (event) => {
    metrics.addMetric(METRICS.PLACE_ORDER.INVOCATION, MetricUnit.Count, 1);

    // Add dimensions to all metrics in this invocation
    metrics.addDimension('Stage', ssm_stage_name || 'unknown');
    metrics.addDimension('Operation', 'PlaceOrder');

    logger.info('Received event:', JSON.stringify(event, null, 2));

    const restaurantName = event.body.restaurantName;

    const orderId = chance.guid();

    logger.debug(`Placing order ${orderId} for restaurant ${restaurantName}`);

    const putEvent = new PutEventsCommand({
      Entries: [
        {
          Source: 'big-mouth-app',
          EventBusName: busName,
          DetailType: 'order_placed',
          Detail: JSON.stringify({
            orderId,
            restaurantName,
          }),
        },
      ],
    });
    await clientEventBridge.send(putEvent);

    logger.info(`Order ${orderId} placed successfully`);

    return successResponse(
      { orderId },
      {
        // CloudFront respects these headers when you use CachePolicy.CACHING_OPTIMIZED or custom policies
        'Cache-Control': 'public, max-age=300',
      }
    );
  },
  {
    metrics,
    responseSchema: orderResponseSchema,
  }
);
