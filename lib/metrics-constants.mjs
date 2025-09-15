// In lib/metrics-constants.mjs
export const METRICS = {
  GET_RESTAURANTS: {
    INVOCATION: 'GetRestaurantsInvocation',
    DURATION: 'GetRestaurantsDuration',
    SUCCESS: 'GetRestaurantsSuccess',
    ERROR: 'GetRestaurantsError',
    RETURNED: 'RestaurantsReturned',
  },
  SEARCH_RESTAURANTS: {
    INVOCATION: 'SearchRestaurantsInvocation',
    DURATION: 'SearchRestaurantsDuration',
    SUCCESS: 'SearchRestaurantsSuccess',
    ERROR: 'SearchRestaurantsError',
    RESULTS: 'SearchRestaurantsResults',
    NO_RESULTS: 'SearchRestaurantsNoResults',
  },
  COLD_START: 'ColdStart',
  PLACE_ORDER: {
    INVOCATION: 'PlaceOrderInvocation',
    DURATION: 'PlaceOrderDuration',
    SUCCESS: 'PlaceOrderSuccess',
    ERROR: 'PlaceOrderError',
  },
};
