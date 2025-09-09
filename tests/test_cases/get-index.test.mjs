import { load } from 'cheerio';
import { describe, expect, it } from 'vitest';
import * as when from '../steps/when.mjs';

describe(`When we invoke the GET / endpoint`, () => {
  it(`Should return the index page with 8 restaurants`, async () => {
    const resp = await when.we_invoke_get_index();

    expect(resp.statusCode).toBe(200);
    expect(resp.headers['Content-Type']).toBe('text/html; charset=UTF-8');
    expect(resp.body).toBeDefined();

    const $ = load(resp.body);
    const restaurants = $('.restaurant', '#restaurantsUl');
    expect(restaurants.length).toBe(8);
  });
});
