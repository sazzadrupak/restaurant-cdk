import { CfnAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ApiAuthorizer extends Construct {
  constructor(scope, id, props) {
    super(scope, id);

    this.cognitoAuthorizer = new CfnAuthorizer(this, 'CognitoAuthorizer', {
      name: 'CognitoAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [props.cognitoUserPool.userPoolArn],
      restApiId: props.api.restApiId,
    });
  }
}
