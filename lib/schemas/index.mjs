export * from './response/restaurants.mjs';

export const successResponse = (data, headers = {}) => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    ...headers,
  },
  body: data,
});

export const errorResponse = (statusCode, error, details = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: {
    error,
    ...details,
  },
});
