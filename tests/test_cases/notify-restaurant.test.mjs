// import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
// import { SNSClient } from '@aws-sdk/client-sns';
// import { Chance } from 'chance';
// import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
// import { startListening } from '../messages.mjs';
// import * as when from '../steps/when';

// const chance = Chance();

// const mockEvbSend = vi.fn();
// const mockSnsSend = vi.fn();

// describe(`When we invoke the notify-restaurant function`, () => {
//   const event = {
//     source: 'big-mouth-app',
//     'detail-type': 'order_placed',
//     detail: {
//       orderId: chance.guid(),
//       restaurantName: 'Fangtasia',
//     },
//   };

//   let listener;

//   beforeAll(async () => {
//     if (process.env.TEST_MODE === 'handler') {
//       EventBridgeClient.prototype.send = mockEvbSend;
//       SNSClient.prototype.send = mockSnsSend;

//       mockEvbSend.mockReturnValue({});
//       mockSnsSend.mockReturnValue({});
//     } else {
//       listener = startListening();
//       await new Promise((resolve) => setTimeout(resolve, 2000));
//     }

//     await when.we_invoke_notify_restaurant(event);

//     // In E2E mode, wait for the event to propagate through the system
//     if (process.env.TEST_MODE !== 'handler') {
//       // Wait longer on the first invocation to account for cold starts
//       await new Promise((resolve) => setTimeout(resolve, 5000));
//     }
//   });

//   afterAll(async () => {
//     if (process.env.TEST_MODE === 'handler') {
//       mockEvbSend.mockClear();
//       mockSnsSend.mockClear();
//     } else {
//       await listener.stop();
//     }
//   });

//   if (process.env.TEST_MODE === 'handler') {
//     it(`Should publish message to SNS`, async () => {
//       expect(mockSnsSend).toHaveBeenCalledTimes(1);
//       const [publishCmd] = mockSnsSend.mock.calls[0];

//       expect(publishCmd.input).toEqual({
//         Message: expect.stringMatching(`"restaurantName":"Fangtasia"`),
//         TopicArn: expect.stringMatching(
//           process.env.restaurant_notification_topic
//         ),
//       });
//     });

//     it(`Should publish event to EventBridge`, async () => {
//       expect(mockEvbSend).toHaveBeenCalledTimes(1);
//       const [putEventsCmd] = mockEvbSend.mock.calls[0];
//       expect(putEventsCmd.input).toEqual({
//         Entries: [
//           expect.objectContaining({
//             Source: 'big-mouth-app',
//             DetailType: 'restaurant_notified',
//             Detail: expect.stringContaining(`"restaurantName":"Fangtasia"`),
//             EventBusName: process.env.bus_name,
//           }),
//         ],
//       });
//     });
//   } else {
//     it(`Should publish message to SNS`, async () => {
//       //the messages have to go from:
//       // 1) our test to the EventBridge bus
//       // 2) forwarded to the notify-restaurant function, which sends a message to SNS
//       // 3) forwarded to the SQS queue we configured earlier
//       // 4) received by our test via long-polling

//       const expectedMsg = JSON.stringify(event.detail);
//       await listener.waitForMessage(
//         (x) =>
//           x.sourceType === 'sns' &&
//           x.source === process.env.restaurant_notification_topic &&
//           x.message === expectedMsg
//       );
//     }, 30000);
//   }
// });

import { Chance } from 'chance';
import { afterAll, beforeAll, describe, it } from 'vitest';

import {
  EVENT_DETAIL_TYPES,
  EVENT_SOURCES,
  MESSAGE_SOURCE_TYPES,
} from '../../lib/constants.mjs';
import { startListening } from '../messages.mjs';
import * as when from '../steps/when';

const chance = Chance();

describe(`When we invoke the notify-restaurant function`, () => {
  const event = {
    source: EVENT_SOURCES.BIG_MOUTH_APP,
    'detail-type': EVENT_DETAIL_TYPES.ORDER_PLACED,
    detail: {
      orderId: chance.guid(),
      restaurantName: 'Fangtasia',
    },
  };

  let listener;

  beforeAll(async () => {
    listener = startListening();
    // Give the listener time to start polling
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await when.we_invoke_notify_restaurant(event);

    // Wait for the event to propagate through the system
    // EventBridge -> Lambda -> SNS -> SQS
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    await listener.stop();
  });

  it(`Should publish message to SNS`, async () => {
    const expectedMsg = JSON.stringify(event.detail);
    await listener.waitForMessage(
      (x) =>
        x.sourceType === MESSAGE_SOURCE_TYPES.SNS &&
        x.source === process.env.restaurant_notification_topic &&
        x.message === expectedMsg
    );
  }, 30000);

  it(`Should publish "restaurant_notified" event to EventBridge`, async () => {
    const expectedMsg = JSON.stringify({
      ...event,
      'detail-type': EVENT_DETAIL_TYPES.RESTAURANT_NOTIFIED,
    });
    await listener.waitForMessage(
      (x) =>
        x.sourceType === MESSAGE_SOURCE_TYPES.EVENTBRIDGE &&
        x.source === process.env.bus_name &&
        x.message === expectedMsg
    );
  }, 30000);
});
