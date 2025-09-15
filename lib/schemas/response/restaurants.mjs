import { transpileSchema } from '@middy/validator/transpile';

const restaurantArraySchema = transpileSchema({
  type: 'array',
  items: {
    type: 'object',
    required: ['name', 'image', 'themes'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 1 },
      image: { type: 'string', pattern: '^https?://' },
      themes: {
        type: 'array',
        minItems: 1,
        items: { type: 'string', minLength: 1 },
      },
    },
  },
});

export const validateRestaurantArray = (data) => {
  const isValid = restaurantArraySchema(data);
  return {
    isValid,
    errors: isValid ? null : restaurantArraySchema.errors,
  };
};

export const getRestaurantsResponseSchema = transpileSchema({
  type: 'object',
  required: ['statusCode', 'body'],
  properties: {
    statusCode: {
      type: 'number',
      enum: [200, 400, 500],
    },
    headers: {
      type: 'object',
      properties: {
        'Content-Type': { type: 'string' },
        'Cache-Control': { type: 'string' },
      },
    },
    body: {
      type: 'string',
      pattern: '^\\[.*\\]$', // Ensure it's a JSON array
    },
  },
});
