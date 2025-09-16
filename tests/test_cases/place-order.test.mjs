import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startListening } from '../messages.mjs';
import * as given from '../steps/given.mjs';
import * as teardown from '../steps/teardown.mjs';
import * as when from '../steps/when.mjs';

describe('Given an authenticated user', () => {
  let user, listener;

  beforeAll(async () => {
    user = await given.an_authenticated_user();
    listener = startListening();
  });

  afterAll(async () => {
    await teardown.an_authenticated_user(user);
    await listener.stop();
  });

  describe(`When we invoke the POST /orders endpoint`, () => {
    let resp;

    beforeAll(async () => {
      resp = await when.we_invoke_place_order('Fangtasia', user);
    });

    it(`Should return 200`, async () => {
      expect(resp.statusCode).toEqual(200);
    });

    it(`Should publish a message to EventBridge bus`, async () => {
      const { orderId } = resp.body;
      const expectedMsg = JSON.stringify({
        source: 'big-mouth-app',
        'detail-type': 'order_placed',
        detail: {
          orderId,
          restaurantName: 'Fangtasia',
        },
      });

      await listener.waitForMessage(
        (x) =>
          x.sourceType === 'eventbridge' &&
          x.source === process.env.bus_name &&
          x.message === expectedMsg
      );
    }, 30000);
  });
});
