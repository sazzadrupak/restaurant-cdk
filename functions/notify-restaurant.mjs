import { Logger } from '@aws-lambda-powertools/logger';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const logger = new Logger({
  serviceName: process.env.service_name,
});
const eventBridge = new EventBridgeClient();
const sns = new SNSClient();

const busName = process.env.bus_name;
const topicArn = process.env.restaurant_notification_topic;

// This notify-restaurant function would be triggered by EventBridge, with the order_placed event that we publish from the place-order function.

export const handler = async (event, Context) => {
  const order = event.detail; // 'detail' contains the payload we sent when we published the event from place-order function
  // publish notifications to the SNS topic to notify the restaurant
  const publishCmd = new PublishCommand({
    Message: JSON.stringify(order),
    TopicArn: topicArn,
  });
  await sns.send(publishCmd);

  const { restaurantName, orderId } = order;
  logger.info(`Notified restaurant ${restaurantName} about order ${orderId}`);

  const putEventsCmd = new PutEventsCommand({
    Entries: [
      {
        EventBusName: busName,
        Source: 'big-mouth-app',
        DetailType: 'restaurant_notified',
        Detail: JSON.stringify(order),
      },
    ],
  });
  await eventBridge.send(putEventsCmd);

  logger.info(`Emitted restaurant_notified event for order ${orderId}`);
};
