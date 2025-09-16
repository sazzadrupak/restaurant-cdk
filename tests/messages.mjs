import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { ReplaySubject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import { MESSAGE_SOURCE_TYPES } from '../lib/constants.mjs';

export const startListening = () => {
  const messages = new ReplaySubject(100);
  const messageIds = new Set();
  let stopIt = false;
  let isReady = false;

  const sqs = new SQSClient();
  const queueUrl = process.env.E2eTestQueueUrl;

  const loop = async () => {
    // Mark as ready after first poll attempt
    isReady = true;

    while (!stopIt) {
      try {
        const receiveCmd = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          // shorter long polling frequency so we don't have to wait as long when we ask it to stop
          WaitTimeSeconds: 5,
        });
        const resp = await sqs.send(receiveCmd);

        if (resp.Messages) {
          resp.Messages.forEach((msg) => {
            if (messageIds.has(msg.MessageId)) {
              // seen this message already, ignore
              return;
            }

            messageIds.add(msg.MessageId);

            const body = JSON.parse(msg.Body);
            if (body.TopicArn) {
              messages.next({
                sourceType: MESSAGE_SOURCE_TYPES.SNS,
                source: body.TopicArn,
                message: body.Message,
              });
            } else if (body.eventBusName) {
              messages.next({
                sourceType: MESSAGE_SOURCE_TYPES.EVENTBRIDGE,
                source: body.eventBusName,
                message: JSON.stringify(body.event),
              });
            }
          });
        }
      } catch (error) {
        console.error('Error receiving SQS messages:', error);
      }
    }
  };

  const loopStopped = loop();

  const stop = async () => {
    console.log('stop polling SQS...');
    stopIt = true;

    await loopStopped;
    console.log('long polling stopped');
  };

  const waitForMessage = (predicate) => {
    const data = messages.pipe(filter((x) => predicate(x)));
    return firstValueFrom(data);
  };

  // Wait for the listener to be ready
  const waitUntilReady = async () => {
    while (!isReady && !stopIt) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  return {
    stop,
    waitForMessage,
    waitUntilReady,
  };
};
