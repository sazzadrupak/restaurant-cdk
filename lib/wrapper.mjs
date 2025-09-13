import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import ssm from '@middy/ssm';

const { service_name, ssm_stage_name } = process.env;

const dynamicCorsMiddleware = () => {
  // origins: ['https://de6oro7mrzc2z.cloudfront.net'],
  // there are several ways to make the CORS origin dynamic instead of hardcoding it:
  // 1. Use Environment Variable
  // 2. Store in SSM Parameter
  // 3. Dynamic Origin Based on Request
  // 4. Combination: Environment Variable with Fallback to SSM
  // 5. Best Practice: Reference CloudFront Distribution
  return {
    after: async (request) => {
      // Ensure response exists with proper structure
      if (!request.response) {
        console.error('No response object in middleware');
        request.response = {
          statusCode: 500,
          body: JSON.stringify({ error: 'No response from handler' }),
          headers: {},
        };
      }

      const origin =
        request.event.headers?.origin || request.event.headers?.Origin;
      const cloudfrontUrl = request.context?.cloudfrontUrl;

      const allowedOrigins = [cloudfrontUrl, 'http://localhost:3000'].filter(
        Boolean
      );

      const allowOrigin = allowedOrigins.includes(origin)
        ? origin
        : cloudfrontUrl || '*';

      // Ensure headers object exists
      request.response.headers = request.response.headers || {};

      // Add CORS headers
      request.response.headers = {
        ...request.response.headers,
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      };
    },
    onError: async (request) => {
      console.error('Error in handler:', request.error);
      console.error('Error stack:', request.error?.stack);

      // Create proper error response with all required fields
      request.response = {
        statusCode: request.error?.statusCode || 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: request.error?.message || 'Internal server error',
          // Include more details in development
          ...(process.env.NODE_ENV !== 'production' && {
            stack: request.error?.stack,
            event: request.event,
          }),
        }),
      };
    },
  };
};

const ensureContentTypeMiddleware = () => ({
  before: async (request) => {
    // If no Content-Type header and there's a body, assume JSON
    if (
      request.event.body &&
      !request.event.headers?.['content-type'] &&
      !request.event.headers?.['Content-Type']
    ) {
      request.event.headers = {
        ...request.event.headers,
        'content-type': 'application/json',
      };
    }
  },
});

export const wrap = (handler) => {
  return middy(handler)
    .before(async (request) => {
      console.info('Incoming event:', JSON.stringify(request.event, null, 2));
    })
    .use(ensureContentTypeMiddleware())
    .use(
      httpJsonBodyParser({
        disableContentTypeError: true,
      })
    )
    .use(
      ssm({
        cache: true,
        cacheExpiry: 1 * 60 * 1000, // 1 mins
        setToContext: true,
        fetchData: {
          serviceQuotas: `/${service_name}/${ssm_stage_name}/serviceQuotas`,
          secretString: `/${service_name}/${ssm_stage_name}/search-restaurants/secretString`,
          cloudfrontUrl: `/${service_name}/${ssm_stage_name}/cloudfront/url`,
        },
        onError: async (request) => {
          console.error('SSM middleware error:', request.error);
          // Don't throw, just log and continue
        },
      })
    )
    .use(dynamicCorsMiddleware())
    .onError(async (request) => {
      console.error('Global error handler:', request.error);
    });
};
