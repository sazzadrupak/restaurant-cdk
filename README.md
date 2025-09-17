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

can deny Lambda the ability to create and write logs to CloudWatch Logs by adding this policy to your Lambda functions:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    }
  ]
}
```

Two ways you can include SNS and Kinesis outputs in your end-to-end tests:

by storing the messages in a DynamoDB table and then poll the table
by broadcasting the messages to an API Gateway websocket and listening for the right messages to arrive
Both approaches go well with using temporary CloudFormation stacks during CI/CD pipeline

When you process events with event-bridge and Lambda, you benefit from the built-in retry & DLQ.
EventBridge is a async event source for lambda. You should prefer lambda destination over DLQ because lambda destination give much more information about the failed event.
Kinesis is much more cost effective then EventBridge at ingeting large volume of data. Unlike EventBridge, where lambda function receies one event at a time, with kinesis, your function receives a batch of events.

Kinesis/DynamoDB Stream based event sources - Lambda will not read any new records from the stream until the failed batch of records either expires or processed successfully. You need to consider partial failures and idempotency when processing Kinesis and DynamoDB streams with Lambda. Failed events should be retried, but the retries should not violate the realtime constraint.

Idempotency - if the same batch is being processed again, either process it safely again or have a way to record the fact that they have been processed already, so you shouldn't process again. Some ways to ensure msgs are not processed multiple times.

- remember the unique message id of the events that has been processed already as a cache in the function (dictionary). This option has some issue, watch this video: https://school.theburningmonk.com/courses/take/production-ready-serverless-apr-2025-cdk/lessons/62669199-lecture-dealing-with-failures
- save ids in a DynamoDB

Lambda has introduced a way to handle these partial failures for SQS functions. In the event source mapping for this function, which configures how a function will process events from SQS, Kinesis, or DynamoDB, you can configure the function response types to include report batch item failures. Once you've done that, you'll be able to use the SQS functions return values to indicate which message IDs could not be processed. And lambda poller would know which message ids to delete from the queue. (https://school.theburningmonk.com/courses/take/production-ready-serverless-apr-2025-cdk/lessons/62669199-lecture-dealing-with-failures)

Asynchronous lambda invocations have an at-least-once semantic. So on rare occasions, your function will receive the same invocation event more than once, EVEN if it had successfully processed it once before. Luckily, the Lambda PowerTools has an Idempotency capability that can help us with that. It uses a DynamoDB table to keep track of the events that we have processed. @aws-lambda-powertools/idempotency needs a DynamoDB Table to keep track of the idempotency tokens, so you need to add a table in database-stack.

AWS added integration between the Fault Injection Service (FIS) and Lambda (for more details, check out this launch post). The integration doesn't require any code changes, but you need to add a FIS Lambda extension to your function. And you also need to set several environment variables to tell the FIS Lambda extension where to load its configuration and so on.
An important metric to alert on when using Lambda's OnFailure destination is Lambda's DestinationDeliveryFailures metric. This tells you when the Lambda function is not able to deliver a message to the OnFailure destination.
You should alert yourself when this metric is greater than 0. Although the Lambda function would retry the failed delivery, it will eventually give up after 24 hours and data would be lost.
we should have two alarms for the "NotifyRestaurant" function:

1. when Lambda's DestinationDeliveryFailures metric is > 0

2. when the SQS queue's ApproximateNumberOfMessagesVisible metric is > 0

When each function has its own OnFailure queue, it's easy to tell which one is experiencing problems. It's also easier to categorize the failures if they're related to temporal issues, such as when a downstream system is experiencing an outage. If you can correlate all N failed messages to the same temporal issue (because they all happened in the same time window), then it's easier to make the decision to reprocess them.

But if all functions share the same OnFailure queue, then an alarm just means something is wrong, and you don't know which function. And if there are multiple messages in the queue, then you'd have to inspect all of them to figure out which functions are impacted. Not to mention it's harder to now if it's safe to reprocess all the failed messages. And there's no easy way for you to ONLY reprocess messages for a particular function because all the failed messages are in one queue.
