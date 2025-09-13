// This will be the entry point for our CDK application.

import { App } from 'aws-cdk-lib';
import { ApiStack } from './constructs/apigateway-stack/api-stack.js';
import { CloudFrontStack } from './constructs/cloudfront-stack.js';
import { CognitoStack } from './constructs/cognito-stack.js';
import { DatabaseStack } from './constructs/database-stack.js';

const app = new App();
const stageName = app.node.tryGetContext('stageName') || 'dev'; // Default to 'dev' if not specified
const ssmStageName = app.node.tryGetContext('ssmStageName') || stageName;
const SERVICE_NAME = 'workshop-sazzad';

const dbStack = new DatabaseStack(app, `DatabaseStack-${stageName}`, {
  stageName,
});

const cognitoStack = new CognitoStack(app, `CognitoStack-${stageName}`, {
  stageName,
});

const apiStack = new ApiStack(app, `ApiStack-${stageName}`, {
  serviceName: SERVICE_NAME,
  stageName,
  ssmStageName,
  restaurantsTable: dbStack.restaurantsTable,
  cognitoUserPool: cognitoStack.cognitoUserPool,
  webUserPoolClient: cognitoStack.webUserPoolClient,
  serverUserPoolClient: cognitoStack.serverUserPoolClient,
});

new CloudFrontStack(app, `CloudFrontStack-${stageName}`, {
  api: apiStack.api,
  stageName,
  serviceName: SERVICE_NAME,
  ssmStageName,
});
