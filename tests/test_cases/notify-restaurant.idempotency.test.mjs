import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SNSClient } from '@aws-sdk/client-sns';
import { Chance } from 'chance';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as when from '../steps/when.mjs';

const chance = Chance();

const mockSnsSend = vi.fn();
SNSClient.prototype.send = mockSnsSend;
const mockEvbSend = vi.fn();
EventBridgeClient.prototype.send = mockEvbSend;

describe('When we invoke the notify-restaurant function twice with the same order ID', () => {
  const event = {
    source: 'big-mouth-app',
    'detail-type': 'order_placed',
    detail: {
      orderId: chance.guid(),
      restaurantName: 'Fangtasia',
    },
  };

  beforeAll(async () => {
    mockSnsSend.mockClear();
    mockEvbSend.mockClear();

    mockEvbSend.mockReturnValue({});
    mockSnsSend.mockReturnValue({});

    await when.we_invoke_notify_restaurant(event);
    await when.we_invoke_notify_restaurant(event);
  });

  if (process.env.TEST_MODE === 'handler') {
    it('Should only publish message to SNS once', async () => {
      expect(mockSnsSend).toHaveBeenCalledTimes(1);
    });

    it('Should only publish "restaurant_notified" event to EventBridge once', async () => {
      expect(mockEvbSend).toHaveBeenCalledTimes(1);
    });
  } else {
    it('no end-to-end tests', () => {});
  }
});
