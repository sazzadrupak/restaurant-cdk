// This will be the entry point for our CDK application.

import { App } from 'aws-cdk-lib';
import { ApiStack } from './constructs/api-stack.js';

const app = new App();
let stageName = app.node.tryGetContext('stageName') || 'dev'; // Default to 'dev' if not specified

if (!stageName) {
  console.warn('No stage specified, defaulting to "dev".');
  stageName = 'dev';
}

new ApiStack(app, `ApiStack-${stageName}`, { stageName });
