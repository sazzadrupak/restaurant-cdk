import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as given from '../steps/given.mjs';
import * as teardown from '../steps/teardown.mjs';
import * as when from '../steps/when.mjs';

const mockSend = vi.fn();
EventBridgeClient.prototype.send = mockSend;

describe('Given an authenticated user', () => {
  let user;

  beforeAll(async () => {
    user = await given.an_authenticated_user();
  });

  afterAll(async () => {
    await teardown.an_authenticated_user(user);
  });

  describe(`When we invoke the POST /orders endpoint`, () => {
    let resp;

    beforeAll(async () => {
      mockSend.mockClear();
      mockSend.mockReturnValue({});

      resp = await when.we_invoke_place_order('Fangtasia', user);
    });

    it(`Should return 200`, async () => {
      expect(resp.statusCode).toEqual(200);
    });

    if (process.env.TEST_MODE === 'handler') {
      it(`Should publish a message to EventBridge bus`, async () => {
        expect(mockSend).toHaveBeenCalledTimes(1);
        const [putEventsCmd] = mockSend.mock.calls[0];

        // Assert the envelope fields without being strict about the Detail string formatting
        expect(putEventsCmd.input).toMatchObject({
          Entries: [
            {
              Source: 'big-mouth-app',
              DetailType: 'order_placed',
              EventBusName: process.env.bus_name || 'order-event-bus',
            },
          ],
        });

        // Parse the Detail payload and assert its properties
        const detail = JSON.parse(putEventsCmd.input.Entries[0].Detail);
        expect(detail).toEqual(
          expect.objectContaining({
            restaurantName: 'Fangtasia',
            // orderId is dynamic — just assert that it's present and a string
            orderId: expect.any(String),
          })
        );
      });
    }
  });
});
