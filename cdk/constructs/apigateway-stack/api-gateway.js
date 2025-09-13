import {
  AccessLogFormat,
  CfnAccount,
  EndpointType,
  GatewayResponse,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseType,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class ApiGateway extends Construct {
  constructor(scope, id, props) {
    super(scope, id);

    // Create log group
    const apiLogGroup = new LogGroup(this, 'ApiGatewayLogs', {
      retention: RetentionDays.ONE_WEEK,
    });

    // Create log role
    const apiGatewayLogRole = new Role(this, 'ApiGatewayLogRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonAPIGatewayPushToCloudWatchLogs'
        ),
      ],
    });

    new CfnAccount(this, 'ApiGatewayAccount', {
      cloudWatchRoleArn: apiGatewayLogRole.roleArn,
    });

    // Create API
    this.api = new RestApi(this, `${props.stageName}-MyApi`, {
      deployOptions: {
        stageName: props.stageName,
        accessLogDestination: new LogGroupLogDestination(apiLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        throttlingRateLimit: 100, // requests per second
        throttlingBurstLimit: 200, // concurrent requests
      },
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'https://d1m4dl58m6ya3c.cloudfront.net',
          'http://localhost:3000',
        ],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowCredentials: true,
      },
    });

    this.api.node.addDependency(apiGatewayLogRole);

    // Configure Gateway Response
    new GatewayResponse(this, 'BadRequestBodyResponse', {
      restApi: this.api,
      type: ResponseType.BAD_REQUEST_BODY,
      statusCode: '400',
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers':
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,OPTIONS'",
      },
      templates: {
        'application/json': JSON.stringify({
          error: 'Bad Request',
          message: '$context.error.message',
          validationError: '$context.error.validationErrorString',
        }),
      },
    });

    this.apiLogicalId = scope.getLogicalId(this.api.node.defaultChild);
  }
}
