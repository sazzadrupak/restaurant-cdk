import { CfnOutput, CfnParameter, Fn, Stack } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CfnAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export class ApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new CfnParameter(this, 'KmsArnParameter', {
      default: `/${props.serviceName}/${props.ssmStageName}/kmsArn`,
      type: 'AWS::SSM::Parameter::Value<String>',
    });

    const api = new RestApi(this, `${props.stageName}-MyApi`, {
      deployOptions: {
        stageName: props.stageName,
      },
    });

    const apiLogicalId = this.getLogicalId(api.node.defaultChild);

    const getIndexFunction = new NodejsFunction(this, 'GetIndex', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/get-index.mjs',
      bundling: {
        format: 'esm',
        commandHooks: {
          afterBundling(inputDir, outputDir) {
            return [
              `mkdir ${outputDir}/static`,
              `cp ${inputDir}/static/index.html ${outputDir}/static/index.html`,
            ];
          },
          beforeBundling() {},
          beforeInstall() {},
        },
      },
      environment: {
        restaurants_api: Fn.sub(
          `https://\${${apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props.stageName}/restaurants`
        ),
        cognito_user_pool_id: props.cognitoUserPool.userPoolId,
        cognito_client_id: props.webUserPoolClient.userPoolClientId,
      },
    });

    const getRestaurantsFunction = new NodejsFunction(this, 'GetRestaurants', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/get-restaurants.mjs',
      environment: {
        service_name: props.serviceName,
        ssm_stage_name: props.ssmStageName,
        restaurants_table: props.restaurantsTable.tableName,
      },
    });
    props.restaurantsTable.grantReadData(getRestaurantsFunction);
    getRestaurantsFunction.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameters*'],
        resources: [
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/serviceQuotas`
          ),
        ],
      })
    );

    const searchRestaurantsFunction = new NodejsFunction(
      this,
      'SearchRestaurants',
      {
        runtime: Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: 'functions/search-restaurants.mjs',
        environment: {
          service_name: props.serviceName,
          ssm_stage_name: props.ssmStageName,
          restaurants_table: props.restaurantsTable.tableName,
        },
      }
    );
    props.restaurantsTable.grantReadData(searchRestaurantsFunction);
    searchRestaurantsFunction.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameters*'],
        resources: [
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/serviceQuotas`
          ),
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/search-restaurants/secretString`
          ),
        ],
      })
    );
    searchRestaurantsFunction.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [Fn.ref('KmsArnParameter')],
      })
    );

    const getIndexLambdaIntegration = new LambdaIntegration(getIndexFunction);
    const getRestaurantsLambdaIntegration = new LambdaIntegration(
      getRestaurantsFunction
    );
    const searchRestaurantsLambdaIntegration = new LambdaIntegration(
      searchRestaurantsFunction
    );

    const cognitoAuthorizer = new CfnAuthorizer(this, 'CognitoAuthorizer', {
      name: 'CognitoAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [props.cognitoUserPool.userPoolArn],
      restApiId: api.restApiId,
    });

    api.root.addMethod('GET', getIndexLambdaIntegration);
    const restaurantsResource = api.root.addResource('restaurants');
    restaurantsResource.addMethod('GET', getRestaurantsLambdaIntegration, {
      authorizationType: AuthorizationType.IAM,
    });
    restaurantsResource
      .addResource('search')
      .addMethod('POST', searchRestaurantsLambdaIntegration, {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: {
          authorizerId: cognitoAuthorizer.ref,
        },
      });

    const apiInvokePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['execute-api:Invoke'],
      resources: [
        Fn.sub(
          `arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${${apiLogicalId}}/${props.stageName}/GET/restaurants`
        ),
      ],
    });
    getIndexFunction.role?.addToPrincipalPolicy(apiInvokePolicy);

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });

    new CfnOutput(this, 'CognitoServerClientId', {
      value: props.serverUserPoolClient.userPoolClientId,
    });

    // From here, other services that want to use your service can find out the service URL by referencing this SSM parameter.
    new StringParameter(this, 'ApiUrlParameter', {
      parameterName: `/${props.serviceName}/${props.stageName}/service-url`,
      stringValue: api.url,
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
