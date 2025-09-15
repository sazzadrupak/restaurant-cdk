import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  clearAllRestaurants,
  generateRestaurants,
  seedRestaurants,
} from '../helpers/test-data.mjs';
import * as when from '../steps/when.mjs';

describe(`When we invoke the GET /restaurants endpoint`, () => {
  let seededRestaurants;

  beforeAll(async () => {
    seededRestaurants = generateRestaurants(8);
    await seedRestaurants(seededRestaurants);
  });

  afterAll(async () => {
    await clearAllRestaurants();
  });

  it(`Should return a list of restaurants`, async () => {
    const resp = await when.we_invoke_get_restaurants();

    expect(resp.statusCode).toBe(200);
    const returnedRestaurants = resp.body;
    expect(returnedRestaurants).toHaveLength(seededRestaurants.length);

    for (const seededRestaurant of seededRestaurants) {
      const found = returnedRestaurants.find(
        (r) => r.name === seededRestaurant.name
      );
      expect(found).toBeTruthy();
      expect(found.image).toBe(seededRestaurant.image);
      expect(found.themes).toEqual(seededRestaurant.themes);
    }
  });
});
