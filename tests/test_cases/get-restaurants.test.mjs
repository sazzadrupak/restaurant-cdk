import { describe, expect, it } from 'vitest';
import * as when from '../steps/when.mjs';

describe(`When we invoke the GET /restaurants endpoint`, () => {
  it(`Should return a list of 8 restaurants`, async () => {
    const resp = await when.we_invoke_get_restaurants();

    expect(resp.statusCode).toBe(200);
    expect(resp.body).toHaveLength(8);

    for (let restaurant of resp.body) {
      expect(restaurant).toHaveProperty('name');
      expect(restaurant).toHaveProperty('image');
    }
  });
});
