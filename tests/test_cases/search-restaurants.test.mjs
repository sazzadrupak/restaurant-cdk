import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  clearAllRestaurants,
  generateRestaurant,
  seedRestaurants,
} from '../helpers/test-data.mjs';
import * as given from '../steps/given.mjs';
import * as teardown from '../steps/teardown.mjs';
import * as when from '../steps/when.mjs';

describe(`When we invoke the POST /restaurants/search endpoint`, () => {
  let user;

  let seededRestaurants;
  const searchTheme = 'cartoon';

  beforeAll(async () => {
    user = await given.an_authenticated_user();

    seededRestaurants = [
      generateRestaurant({ themes: [searchTheme, 'rick and morty'] }),
      generateRestaurant({ themes: [searchTheme, 'simpsons'] }),
      generateRestaurant({ themes: [searchTheme, 'family guy'] }),
      generateRestaurant({ themes: ['movie', 'star wars'] }), // Different theme
      generateRestaurant({ themes: ['netflix', 'stranger things'] }), // Different theme
    ];

    await seedRestaurants(seededRestaurants);
  });

  afterAll(async () => {
    await clearAllRestaurants();
    await teardown.an_authenticated_user(user);
  });

  it(`Should return restaurants with the specified theme`, async () => {
    const resp = await when.we_invoke_search_restaurants(searchTheme, user);

    expect(resp.statusCode).toBe(200);

    const returnedRestaurants = resp.body;

    // Should return only restaurants with the cartoon theme
    const expectedRestaurants = seededRestaurants.filter((r) =>
      r.themes.includes(searchTheme)
    );

    expect(returnedRestaurants).toHaveLength(expectedRestaurants.length);

    // Verify all returned restaurants have the search theme
    for (const restaurant of returnedRestaurants) {
      expect(restaurant.themes).toContain(searchTheme);
    }
  });

  it(`Should return empty array when no restaurants match the theme`, async () => {
    const nonExistentTheme = 'non-existent-theme';
    const resp = await when.we_invoke_search_restaurants(
      nonExistentTheme,
      user
    );

    expect(resp.statusCode).toBe(200);

    const returnedRestaurants = resp.body;
    expect(returnedRestaurants).toHaveLength(0);
  });
});
