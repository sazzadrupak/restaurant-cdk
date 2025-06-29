import { Stack } from 'aws-cdk-lib';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a Cognito User Pool
    const userPool = new UserPool(this, `${props.stageName}-UserPool`, {
      userPoolName: `${props.stageName}-UserPool`,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
    });

    // used by the landing page frontend, this would be used to register new users, and support sign-in and sign-out.
    new UserPoolClient(this, `${props.stageName}-WebUserPoolClient`, {
      userPool,
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // we will use this later to programmatically create new users using the admin flow
    new UserPoolClient(this, `${props.stageName}-ServerUserPoolClient`, {
      userPool,
      authFlows: {
        adminUserPassword: true,
      },
      preventUserExistenceErrors: true,
    });
  }
}
