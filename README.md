# Welcome to your CDK JavaScript project

This is a blank project for CDK development with JavaScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

## Useful commands

- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

By default, SSM Parameter Store doesn't charge you for usage. On the flip side, it restricts you to a measly 40 ops/second. This is often not enough in a production environment, especially if functions need to load, and periodically refresh their configs from SSM Parameter Store.

Fortunately, you can significantly raise this throughput limit by, going to the SSM Parameter Store console, go to the Settings tab, and click Set Limit.

\*\*\*Remember to create the ssm parameters for both dev and dev-ci stage. `/workshop-sazzad/dev/get-restaurants/config` & `/workshop-sazzad/dev/search-restaurants/config`. Otherwise the test cases running in the CI will fail.

Use `export AWS_PROFILE=main-profile` and `export AWS_REGION=us-east-1` before deploying cdk

AWS publishes a number of public parameters inside the SSM Parameter Store, things like AMI ARNs, etc. This is a useful way to communicate relevant data to the consumers of your service. And while we cannot publish public parameters to SSM Parameter Store, we can still take inspiration from this approach and share relevant information about our service with others (that reside in the same AWS account) - e.g. the service's root URL and operational constraints such as the max no. of restaurants that can be returned in a search result, etc.

The crazy thing is that CloudFormation doesn't currently support SecureString parameters...So there's no built-in way to create SecureString parameters with the CDK. But you can install the cdk-secure-string-parameter package or create a custom resource yourself to create SecureString parameters in SSM. Switch to higher throughput of ssm if you need more than 40 ops/s. Or, you can store the variable in dynamodb.

Have lambda function fetch and decrypt the parameters at runtime during cold start.

It's easy to write a custom rotation cron job for SSM parameter.

Before running test cases (locally or CI/CD), you must create the following:

`/workshop-sazzad/dev-ci/search-restaurants/secretString`
`/workshop-sazzad/dev/search-restaurants/secretString`
`/workshop-sazzad/dev-ci/kmsArn`
`/workshop-sazzad/dev/kmsArn`

For serverful resources, you should share them instead instead of creating a copy in each account and let the envs in each account to use it. Deploy serverful resources in shared infra in cloud formation template.

Artillery is a load test tool allows to test load against HTTP or websocket.
Locust is also a load testing tool support distributed load testing.
Include any asynchronous parts as part of the load test to make sure they too can handle increased load.

I case of JavaScript, you can reference the shared libraries between different services through symlinks, and then resolve them at the deployment time using bundlers like Webpack.

SCP restricts user from doing something, not enabling.

Why CloudFront caching is better than API Gateway caching:
Cost Efficiency:

CloudFront: Pay only for data transfer and requests
API Gateway cache: Hourly charges ($14-$1700/month depending on size)
Global Distribution:

CloudFront: Caches at 400+ edge locations worldwide
API Gateway: Caches only in the deployed region
Better Performance:

CloudFront: Serves from edge locations closer to users
API Gateway: All requests still go to your API region
More Flexible Cache Control:

CloudFront: Fine-grained cache behaviors per path
API Gateway: Limited cache key options
