import { fromNodeProviderChain } from '@aws-sdk/credential-providers'; // To resolve the current AWS credentials for aws4fetch package, we can use the @aws-sdk/credential-providers utility package from the AWS SDK v3.
import { AwsClient } from 'aws4fetch'; // This package lets us sign HTTP requests using our AWS credentials. For it to work, it also needs the AWS credentials.
import fs from 'fs';
import Mustache from 'mustache';

const restaurantsApiRoot = process.env.restaurants_api;
const cognitoUserPoolId = process.env.cognito_user_pool_id;
const cognitoClientId = process.env.cognito_client_id;
const awsRegion = process.env.AWS_REGION;
const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const credentialProvider = fromNodeProviderChain();
const credentials = await credentialProvider();
const aws = new AwsClient({
  accessKeyId: credentials.accessKeyId,
  secretAccessKey: credentials.secretAccessKey,
  sessionToken: credentials.sessionToken,
});

const template = fs.readFileSync('static/index.html', 'utf-8');

const getRestaurants = async () => {
  console.info(
    'Fetching restaurants from the restaurants API...',
    restaurantsApiRoot
  );
  const resp = await aws.fetch(restaurantsApiRoot);
  console.info('Restaurants API response', resp.status, resp.statusText);
  if (!resp.ok) {
    throw new Error('Failed to fetch restaurants: ' + resp.statusText);
  }
  return await resp.json();
};

export const handler = async (event, context) => {
  const restaurants = await getRestaurants();
  const dayOfWeek = days[new Date().getDay()];
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
  };
  const html = Mustache.render(template, view);
  const response = {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
    body: html,
  };

  return response;
};

// The "GetIndex" function now depends on packages in the "node_modules" folder. And we can't just take the whole "node_modules" folder because it includes lots of packages that we won't even need, and that will blow up the size of our function.

// Fortunately, CDK has a "NodejsFunction" construct that can deal with this.

// Unfortunately, the "NodejsFunction" requires Docker, so we have to install that first... And it also doesn't bundle additional assets like the "static/index.html" file. So that's another challenge we have to solve.

// Also, it uses esbuild to bundle the function, which can create several problems and tough trade-offs involving source maps:

// Without a source map, the stack trace from the function would be useless.
// With a source map, the size of the bundled function can blow up significantly and significantly impact the cold start time of the function.
// If the size of the source map is significant, then it can add a noticeable delay to the invocation when the function errors. Because the runtime has to load the source map file at that point to produce a meaningful stack trace. I have seen an erroneous invocation (for a function with lots of dependencies) take several seconds to respond, and that's unacceptable from a user experience POV.
// So despite its drawbacks, I would recommend not including a source map. Which is also the default behaviour of the "NodejsFunction" construct.

// This @aws-sdk/credential-providers can create a number of different "provider chains" - i.e. a sequence of places where we should look for AWS credentials.

// The one we want is Node.js's default credentials provider chain.

// It follow the same logic as the AWS SDKs and looks for your AWS credentials in a number of places:

// * in the environment variables

// * SSO credentials

// * web identity tokens

// * AWS profiles (both .aws/~config and .aws/~credentials)

// * EC2 instance metadata and ECS metadata
