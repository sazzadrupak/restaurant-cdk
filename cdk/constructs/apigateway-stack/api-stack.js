import { CfnOutput, CfnParameter, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

// import { WafStack } from '../waf-stack.js';
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

    // Create WAF Web ACL and associate with API Gateway
    // WARNING: WAF has costs - approximately $5/month + $1 per million requests
    // Comment out this section to avoid WAF charges
    // new WafStack(this, 'ApiWaf', {
    //   api: apiGateway.api,
    //   apiGateway,
    //   stageName: props.stageName,
    //   region: this.region,
    // });

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
