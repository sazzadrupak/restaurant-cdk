// import { CfnOutput, CfnParameter, Fn, Stack } from 'aws-cdk-lib';
// import {
//   AccessLogFormat,
//   AuthorizationType,
//   CfnAccount,
//   CfnAuthorizer,
//   EndpointType,
//   GatewayResponse,
//   LambdaIntegration,
//   LogGroupLogDestination,
//   MethodLoggingLevel,
//   Model,
//   ResponseType,
//   RestApi,
// } from 'aws-cdk-lib/aws-apigateway';
// import {
//   Effect,
//   ManagedPolicy,
//   PolicyStatement,
//   Role,
//   ServicePrincipal,
// } from 'aws-cdk-lib/aws-iam';
// import { Runtime } from 'aws-cdk-lib/aws-lambda';
// import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
// import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
// import { StringParameter } from 'aws-cdk-lib/aws-ssm';

// export class ApiStack extends Stack {
//   constructor(scope, id, props) {
//     super(scope, id, props);

//     new CfnParameter(this, 'KmsArnParameter', {
//       default: `/${props.serviceName}/${props.ssmStageName}/kmsArn`,
//       type: 'AWS::SSM::Parameter::Value<String>',
//     });

//     // Create a log group for API Gateway
//     const apiLogGroup = new LogGroup(this, 'ApiGatewayLogs', {
//       retention: RetentionDays.ONE_WEEK,
//     });

//     const apiGatewayLogRole = new Role(this, 'ApiGatewayLogRole', {
//       assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
//       managedPolicies: [
//         ManagedPolicy.fromAwsManagedPolicyName(
//           'service-role/AmazonAPIGatewayPushToCloudWatchLogs'
//         ),
//       ],
//     });

//     new CfnAccount(this, 'ApiGatewayAccount', {
//       cloudWatchRoleArn: apiGatewayLogRole.roleArn,
//     });

//     const api = new RestApi(this, `${props.stageName}-MyApi`, {
//       deployOptions: {
//         stageName: props.stageName,
//         accessLogDestination: new LogGroupLogDestination(apiLogGroup),
//         accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
//         loggingLevel: MethodLoggingLevel.INFO,
//         dataTraceEnabled: true,
//       },
//       endpointConfiguration: {
//         types: [EndpointType.REGIONAL],
//       },
//       defaultCorsPreflightOptions: {
//         // allowOrigins: Cors.ALL_ORIGINS, // In production, specify your CloudFront domain
//         // allowMethods: Cors.ALL_METHODS, // this is also the default
//         // allowHeaders: [
//         //   'Content-Type',
//         //   'X-Amz-Date',
//         //   'Authorization',
//         //   'X-Api-Key',
//         //   'X-Amz-Security-Token',
//         // ],
//         allowOrigins: [
//           'https://dqev16claqyle.cloudfront.net', // Your CloudFront domain
//           'http://localhost:3000', // For local development
//         ],
//         allowMethods: ['GET', 'POST', 'OPTIONS'],
//         allowHeaders: [
//           'Content-Type',
//           'X-Amz-Date',
//           'Authorization',
//           'X-Api-Key',
//         ],
//         allowCredentials: true,
//       },
//     });
//     api.node.addDependency(apiGatewayLogRole);
//     new GatewayResponse(this, 'BadRequestBodyResponse', {
//       restApi: api,
//       type: ResponseType.BAD_REQUEST_BODY,
//       statusCode: '400',
//       responseHeaders: {
//         'Access-Control-Allow-Origin': "'*'",
//         'Access-Control-Allow-Headers':
//           "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
//         'Access-Control-Allow-Methods': "'GET,POST,OPTIONS'",
//       },
//       templates: {
//         'application/json': JSON.stringify({
//           error: 'Bad Request',
//           message: '$context.error.message',
//           validationError: '$context.error.validationErrorString',
//         }),
//       },
//     });

//     this.api = api;

//     const apiLogicalId = this.getLogicalId(api.node.defaultChild);

//     const getIndexFunction = new NodejsFunction(this, 'GetIndex', {
//       runtime: Runtime.NODEJS_20_X,
//       handler: 'handler',
//       entry: 'functions/get-index.mjs',
//       bundling: {
//         format: 'esm',
//         commandHooks: {
//           afterBundling(inputDir, outputDir) {
//             return [
//               `mkdir ${outputDir}/static`,
//               `cp ${inputDir}/static/index.html ${outputDir}/static/index.html`,
//             ];
//           },
//           beforeBundling() {},
//           beforeInstall() {},
//         },
//       },
//       environment: {
//         restaurants_api: Fn.sub(
//           `https://\${${apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props.stageName}/restaurants`
//         ),
//         cognito_user_pool_id: props.cognitoUserPool.userPoolId,
//         cognito_client_id: props.webUserPoolClient.userPoolClientId,
//       },
//     });

//     const getRestaurantsFunction = new NodejsFunction(this, 'GetRestaurants', {
//       runtime: Runtime.NODEJS_20_X,
//       handler: 'handler',
//       entry: 'functions/get-restaurants.mjs',
//       environment: {
//         service_name: props.serviceName,
//         ssm_stage_name: props.ssmStageName,
//         restaurants_table: props.restaurantsTable.tableName,
//         cloudfront_url: props.cloudfrontUrl,
//       },
//     });
//     props.restaurantsTable.grantReadData(getRestaurantsFunction);
//     getRestaurantsFunction.role.addToPrincipalPolicy(
//       new PolicyStatement({
//         effect: Effect.ALLOW,
//         actions: ['ssm:GetParameters*'],
//         resources: [
//           Fn.sub(
//             `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/serviceQuotas`
//           ),
//         ],
//       })
//     );

//     const searchRestaurantsFunction = new NodejsFunction(
//       this,
//       'SearchRestaurants',
//       {
//         runtime: Runtime.NODEJS_20_X,
//         handler: 'handler',
//         entry: 'functions/search-restaurants.mjs',
//         environment: {
//           service_name: props.serviceName,
//           ssm_stage_name: props.ssmStageName,
//           restaurants_table: props.restaurantsTable.tableName,
//           cloudfront_url: props.cloudfrontUrl,
//         },
//       }
//     );
//     props.restaurantsTable.grantReadData(searchRestaurantsFunction);
//     searchRestaurantsFunction.role.addToPrincipalPolicy(
//       new PolicyStatement({
//         effect: Effect.ALLOW,
//         actions: ['ssm:GetParameters*'],
//         resources: [
//           Fn.sub(
//             `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/serviceQuotas`
//           ),
//           Fn.sub(
//             `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/search-restaurants/secretString`
//           ),
//           Fn.sub(
//             `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/cloudfront/url`
//           ),
//         ],
//       })
//     );
//     searchRestaurantsFunction.role.addToPrincipalPolicy(
//       new PolicyStatement({
//         effect: Effect.ALLOW,
//         actions: ['kms:Decrypt'],
//         resources: [Fn.ref('KmsArnParameter')],
//       })
//     );

//     // Define a model for the search request body
//     const searchRestaurantsRequestModel = new Model(
//       this,
//       'SearchRestaurantsRequestModel',
//       {
//         restApi: api,
//         contentType: 'application/json',
//         modelName: 'SearchRestaurantsRequestModel',
//         schema: {
//           type: 'object',
//           properties: {
//             theme: { type: 'string' },
//             count: { type: 'integer', minimum: 1, maximum: 50 },
//           },
//           required: ['theme'],
//           additionalProperties: false,
//         },
//       }
//     );

//     const getIndexLambdaIntegration = new LambdaIntegration(getIndexFunction);
//     const getRestaurantsLambdaIntegration = new LambdaIntegration(
//       getRestaurantsFunction
//     );
//     const searchRestaurantsLambdaIntegration = new LambdaIntegration(
//       searchRestaurantsFunction
//     );

//     const cognitoAuthorizer = new CfnAuthorizer(this, 'CognitoAuthorizer', {
//       name: 'CognitoAuthorizer',
//       type: 'COGNITO_USER_POOLS',
//       identitySource: 'method.request.header.Authorization',
//       providerArns: [props.cognitoUserPool.userPoolArn],
//       restApiId: api.restApiId,
//     });

//     api.root.addMethod('GET', getIndexLambdaIntegration);
//     const restaurantsResource = api.root.addResource('restaurants');
//     restaurantsResource.addMethod('GET', getRestaurantsLambdaIntegration, {
//       authorizationType: AuthorizationType.IAM,
//     });

//     // If you need CORS on specific resources only
//     // const searchResource = restaurantsResource.addResource('search');
//     // searchResource.addCorsPreflight({
//     //   allowOrigins: Cors.ALL_ORIGINS,
//     //   allowMethods: ['POST', 'OPTIONS'],
//     //   allowHeaders: ['Content-Type', 'Authorization'],
//     // });

//     // searchResource.addMethod('POST', searchRestaurantsLambdaIntegration, {
//     //   authorizationType: AuthorizationType.COGNITO,
//     //   authorizer: {
//     //     authorizerId: cognitoAuthorizer.ref,
//     //   },
//     // });
//     restaurantsResource
//       .addResource('search')
//       .addMethod('POST', searchRestaurantsLambdaIntegration, {
//         authorizationType: AuthorizationType.COGNITO,
//         authorizer: {
//           authorizerId: cognitoAuthorizer.ref,
//         },
//         requestModels: {
//           'application/json': searchRestaurantsRequestModel,
//         },
//         requestValidatorOptions: {
//           validateRequestBody: true,
//           validateRequestParameters: false,
//         },
//       });

//     const apiInvokePolicy = new PolicyStatement({
//       effect: Effect.ALLOW,
//       actions: ['execute-api:Invoke'],
//       resources: [
//         Fn.sub(
//           `arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${${apiLogicalId}}/${props.stageName}/GET/restaurants`
//         ),
//       ],
//     });
//     getIndexFunction.role?.addToPrincipalPolicy(apiInvokePolicy);

//     new CfnOutput(this, 'ApiUrl', {
//       value: api.url,
//     });

//     new CfnOutput(this, 'CognitoServerClientId', {
//       value: props.serverUserPoolClient.userPoolClientId,
//     });

//     // From here, other services that want to use your service can find out the service URL by referencing this SSM parameter.
//     new StringParameter(this, 'ApiUrlParameter', {
//       parameterName: `/${props.serviceName}/${props.stageName}/service-url`,
//       stringValue: api.url,
//     });

//     new StringParameter(this, 'ServiceQuotas', {
//       parameterName: `/${props.serviceName}/${props.ssmStageName}/serviceQuotas`,
//       stringValue: JSON.stringify({
//         getRestaurants: {
//           defaultResults: 8,
//           maxResults: 100,
//         },
//         searchRestaurants: {
//           defaultResults: 8,
//           maxResults: 50,
//         },
//       }),
//     });
//   }
// }

import { CfnOutput, CfnParameter, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

import { ApiAuthorizer } from './api-authorizer.js';
import { ApiFunctions } from './api-functions.js';
import { ApiGateway } from './api-gateway.js';
import { ApiModels } from './api-models.js';
import { ApiResources } from './api-resources.js';

export class ApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create KMS parameter at stack level
    const kmsArnParameter = new CfnParameter(this, 'KmsArnParameter', {
      default: `/${props.serviceName}/${props.ssmStageName}/kmsArn`,
      type: 'AWS::SSM::Parameter::Value<String>',
    });

    // Create API Gateway
    const apiGateway = new ApiGateway(this, 'ApiGateway', {
      stageName: props.stageName,
      cloudfrontUrl: props.cloudfrontUrl,
    });

    // Expose the API for use by other stacks
    this.api = apiGateway.api;

    // Create Models
    const models = new ApiModels(this, 'ApiModels', {
      api: apiGateway.api,
    });

    // Create Lambda Functions
    const functions = new ApiFunctions(this, 'ApiFunctions', {
      stageName: props.stageName,
      serviceName: props.serviceName,
      ssmStageName: props.ssmStageName,
      restaurantsTable: props.restaurantsTable,
      cloudfrontUrl: props.cloudfrontUrl,
      cognitoUserPool: props.cognitoUserPool,
      webUserPoolClient: props.webUserPoolClient,
      apiLogicalId: apiGateway.apiLogicalId,
      kmsArnParameter: kmsArnParameter, // Pass the parameter reference
    });

    // Create Authorizer
    const authorizer = new ApiAuthorizer(this, 'ApiAuthorizer', {
      api: apiGateway.api,
      cognitoUserPool: props.cognitoUserPool,
    });

    // Create Resources and Methods
    new ApiResources(this, 'ApiResources', {
      api: apiGateway.api,
      functions: functions,
      authorizer: authorizer,
      models: models,
    });

    // Outputs
    new CfnOutput(this, 'ApiUrl', {
      value: apiGateway.api.url,
    });

    new CfnOutput(this, 'CognitoServerClientId', {
      value: props.serverUserPoolClient.userPoolClientId,
    });

    // SSM Parameters
    new StringParameter(this, 'ApiUrlParameter', {
      parameterName: `/${props.serviceName}/${props.stageName}/service-url`,
      stringValue: apiGateway.api.url,
    });

    new StringParameter(this, 'ServiceQuotas', {
      parameterName: `/${props.serviceName}/${props.ssmStageName}/serviceQuotas`,
      stringValue: JSON.stringify({
        getRestaurants: {
          defaultResults: 8,
          maxResults: 100,
        },
        searchRestaurants: {
          defaultResults: 8,
          maxResults: 50,
        },
      }),
    });
  }
}
