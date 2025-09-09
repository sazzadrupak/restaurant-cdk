const APP_ROOT = '../../';
import _ from 'lodash';

const viaHandler = async (event, functionName) => {
  const { handler } = await import(`${APP_ROOT}functions/${functionName}.mjs`);

  const context = {};

  const response = await handler(event, context);
  const contentType = _.get(
    response,
    'headers.Content-Type',
    'application/json'
  );
  if (response.body && contentType === 'application/json') {
    response.body = JSON.parse(response.body);
  }
  return response;
};

export const we_invoke_get_index = () => viaHandler({}, 'get-index');
export const we_invoke_get_restaurants = () =>
  viaHandler({}, 'get-restaurants');
export const we_invoke_search_restaurants = (theme) => {
  let event = {
    body: JSON.stringify({ theme }),
  };
  return viaHandler(event, 'search-restaurants');
};
