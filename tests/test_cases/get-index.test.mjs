import { load } from 'cheerio';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  clearAllRestaurants,
  generateRestaurants,
  seedRestaurants,
} from '../helpers/test-data.mjs';
import * as when from '../steps/when.mjs';

describe(`When we invoke the GET / endpoint`, () => {
  let seededRestaurants;

  beforeAll(async () => {
    seededRestaurants = generateRestaurants(8);
    await seedRestaurants(seededRestaurants);
  });

  afterAll(async () => {
    await clearAllRestaurants();
  });

  it(`Should return the index page with 8 restaurants`, async () => {
    const resp = await when.we_invoke_get_index();

    expect(resp.statusCode).toBe(200);
    expect(resp.headers['content-type']).toBe('text/html; charset=UTF-8');
    expect(resp.body).toBeDefined();

    const $ = load(resp.body);
    const restaurants = $('.restaurant', '#restaurantsUl');
    expect(restaurants.length).toBe(seededRestaurants.length);

    // Verify the restaurant names are displayed
    // restaurants.each((index, element) => {
    //   const restaurantName = $(element).find('.restaurantName').text();
    //   const found = seededRestaurants.find((r) => r.name === restaurantName);
    //   expect(found).toBeTruthy();
    // });
  });
});
