const APP_ROOT = '../../';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsClient } from 'aws4fetch';
import _ from 'lodash';

const mode = process.env.TEST_MODE;

const viaEventBridge = async (busName, source, detailType, detail) => {
  const eventBridge = new EventBridgeClient();
  const putEventsCmd = new PutEventsCommand({
    Entries: [
      {
        Source: source,
        EventBusName: busName,
        DetailType: detailType,
        Detail: JSON.stringify(detail),
      },
    ],
  });
  await eventBridge.send(putEventsCmd);
};

const viaHandler = async (event, functionName) => {
  const { handler } = await import(`${APP_ROOT}functions/${functionName}.mjs`);

  const context = {};

  const response = await handler(event, context);
  const contentType = _.get(
    response,
    'headers.content-type',
    'application/json'
  );
  if (_.get(response, 'body') && contentType === 'application/json') {
    response.body = JSON.parse(response.body);
  }
  return response;
};

const viaHttp = async (relPath, method = 'GET', options) => {
  const url = `${process.env.ApiUrl}${relPath}`;

  const body = _.get(options, 'body');
  const headers = {
    ..._.get(options, 'headers', {}), // Merge any additional headers
  };

  const authHeader = _.get(options, 'auth');

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  let res;

  if (_.get(options, 'iam_auth', false) === true) {
    const credentialProvider = fromNodeProviderChain();
    const credentials = await credentialProvider();
    const aws = new AwsClient({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });
    res = await aws.fetch(url, { method, headers, body });
  } else {
    res = await fetch(url, {
      method,
      headers,
      body,
    });
  }

  const respHeaders = {};
  for (const [k, v] of res.headers.entries()) {
    respHeaders[k] = v;
  }

  const respBody =
    respHeaders['content-type'] === 'application/json'
      ? await res.json()
      : await res.text();

  return {
    statusCode: res.status,
    body: respBody,
    headers: respHeaders,
  };
};

export const we_invoke_get_index = async () => {
  switch (mode) {
    case 'handler':
      return viaHandler({}, 'get-index');
    case 'http':
      return await viaHttp('', 'GET');
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
};
export const we_invoke_get_restaurants = async () => {
  switch (mode) {
    case 'handler':
      return viaHandler({}, 'get-restaurants');
    case 'http':
      return await viaHttp('restaurants', 'GET', { iam_auth: true });
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
};
export const we_invoke_search_restaurants = async (theme, user) => {
  const body = JSON.stringify({ theme });
  switch (mode) {
    case 'handler':
      return await viaHandler({ body }, 'search-restaurants');
    case 'http':
      const auth = user.idToken;
      return await viaHttp('restaurants/search', 'POST', {
        body,
        auth,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_place_order = async (restaurantName, user) => {
  const body = JSON.stringify({ restaurantName });
  switch (mode) {
    case 'handler':
      return await viaHandler({ body }, 'place-order');
    case 'http':
      const auth = user.idToken;
      return await viaHttp('orders', 'POST', {
        body,
        auth,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_notify_restaurant = async (event) => {
  if (mode === 'handler') {
    await viaHandler(event, 'notify-restaurant');
  } else {
    const busName = process.env.bus_name;
    await viaEventBridge(
      busName,
      event.source,
      event['detail-type'],
      event.detail
    );

    // Wait a bit for EventBridge to process the event
    // This is especially important on the first run due to cold starts
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};
