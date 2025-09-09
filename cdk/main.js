// This will be the entry point for our CDK application.

import { App } from 'aws-cdk-lib';
import { ApiStack } from './constructs/api-stack.js';
import { CognitoStack } from './constructs/cognito-stack.js';
import { DatabaseStack } from './constructs/database-stack.js';

const app = new App();
let stageName = app.node.tryGetContext('stageName') || 'dev'; // Default to 'dev' if not specified

if (!stageName) {
  console.warn('No stage specified, defaulting to "dev".');
  stageName = 'dev';
}

const dbStack = new DatabaseStack(app, `DatabaseStack-${stageName}`, {
  stageName,
});

const cognitoStack = new CognitoStack(app, `CognitoStack-${stageName}`, {
  stageName,
});

new ApiStack(app, `ApiStack-${stageName}`, {
  stageName,
  restaurantsTable: dbStack.restaurantsTable,
  cognitoUserPool: cognitoStack.cognitoUserPool,
  webUserPoolClient: cognitoStack.webUserPoolClient,
  serverUserPoolClient: cognitoStack.serverUserPoolClient,
});
