import { MetricUnit } from '@aws-lambda-powertools/metrics';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import ssm from '@middy/ssm';

const { service_name, ssm_stage_name } = process.env;

// Add a flag to track cold starts at module level
let isColdStart = true;

const metricsMiddleware = (metricsInstance) => {
  return {
    before: async (request) => {
      // Capture cold start metric
      if (isColdStart && metricsInstance) {
        metricsInstance.addMetric('ColdStart', MetricUnit.Count, 1);
        isColdStart = false;
      }
    },
    after: async (request) => {
      // Auto-publish metrics if not already done
      if (
        metricsInstance &&
        typeof metricsInstance.publishStoredMetrics === 'function'
      ) {
        await metricsInstance.publishStoredMetrics();
      }
    },
    onError: async (request) => {
      // Ensure metrics are published even on error
      if (
        metricsInstance &&
        typeof metricsInstance.publishStoredMetrics === 'function'
      ) {
        await metricsInstance.publishStoredMetrics();
      }
    },
  };
};

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

export const wrap = (handler, options = {}) => {
  let middyHandler = middy(handler)
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
      })
    )
    .use(dynamicCorsMiddleware());

  // Add metrics middleware if metrics instance is provided
  if (options.metrics) {
    middyHandler = middyHandler.use(metricsMiddleware(options.metrics));
  }

  // Add global error handler
  return middyHandler.onError(async (request) => {
    console.error('Global error handler:', request.error);

    // Ensure a response is set
    if (!request.response) {
      request.response = {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: request.error?.message || 'Internal server error',
          stack:
            process.env.NODE_ENV !== 'production'
              ? request.error?.stack
              : undefined,
        }),
      };
    }
  });
};

// Export a version that includes metrics
export const wrapWithMetrics = (handler, metricsInstance) => {
  return wrap(handler, { metrics: metricsInstance });
};
