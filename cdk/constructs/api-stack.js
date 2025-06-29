import { Fn, Stack } from 'aws-cdk-lib';
import {
  AuthorizationType,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class ApiStack extends Stack {
  /**
   * @param {Construct} scope // The "scope" is the parent construct. If "scope" is null, then the construct is the root, which is the CDK app itself
   * @param {string} id // forms the basis of the logical ID of the resource in the synthesized CloudFormation stack.
   * @param {StackProps} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create an API Gateway REST API
    const api = new RestApi(this, `${props.stageName}-MyApi`, {
      deployOptions: {
        stageName: props.stageName, // Use the stage name from the context
      },
    });
    const apiLogicalId = this.getLogicalId(api.node.defaultChild);

    // Create a Lambda function
    const getIndexFunction = new NodejsFunction(this, 'GetIndex', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/get-index.mjs', // The entry point for the Lambda function
      bundling: {
        format: 'esm',
        commandHooks: {
          afterBundling(inputDir, outputDir) {
            // Copy the static files to the output directory
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
        ), // The API Gateway URL for the restaurants endpoint
      },
    });

    // const cfnLambdaFunction = lambdaFunction.node.defaultChild; // that represents the Lambda function in the CloudFormation template. You can then call "overrideLogicalId" on this object to set the exact logical ID.
    // cfnLambdaFunction.overrideLogicalId('HandlerFunction');

    const getRestaurantsFunction = new Function(this, 'GetRestaurants', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'get-restaurants.handler',
      code: Code.fromAsset('functions'),
      environment: {
        default_results: '8', // Default number of results to return
        table_name: props.restaurantsTable.tableName, // Name of the DynamoDB table
      },
    });
    props.restaurantsTable.grantReadData(getRestaurantsFunction); //

    // Integrate the Lambda function with the API Gateway
    const getIndexLambdaIntegration = new LambdaIntegration(getIndexFunction);
    const getRestaurantsLambdaIntegration = new LambdaIntegration(
      getRestaurantsFunction
    );
    api.root.addMethod('GET', getIndexLambdaIntegration);
    api.root
      .addResource('restaurants')
      .addMethod('GET', getRestaurantsLambdaIntegration, {
        authorizationType: AuthorizationType.IAM,
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
  }
}
