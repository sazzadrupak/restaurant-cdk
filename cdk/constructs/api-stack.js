import { Stack } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';

export class ApiStack extends Stack {
  /**
   * @param {Construct} scope // The "scope" is the parent construct. If "scope" is null, then the construct is the root, which is the CDK app itself
   * @param {string} id // forms the basis of the logical ID of the resource in the synthesized CloudFormation stack.
   * @param {StackProps} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a Lambda function
    const lambdaFunction = new Function(this, 'HandlerFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler.hello',
      code: Code.fromAsset('functions'),
    });

    const cfnLambdaFunction = lambdaFunction.node.defaultChild; // that represents the Lambda function in the CloudFormation template. You can then call "overrideLogicalId" on this object to set the exact logical ID.
    cfnLambdaFunction.overrideLogicalId('HandlerFunction');

    // Create an API Gateway REST API
    const api = new RestApi(this, `${props.stageName}-MyApi`, {
      deployOptions: {
        stageName: props.stageName, // Use the stage name from the context
      },
      restApiName: 'Hello Service',
      description: 'This service serves hello world messages.',
    });

    // Integrate the Lambda function with the API Gateway
    const lambdaIntegration = new LambdaIntegration(lambdaFunction);
    api.root.addMethod('GET', lambdaIntegration); // GET /hello
  }
}
