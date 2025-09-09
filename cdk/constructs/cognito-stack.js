import { Stack } from 'aws-cdk-lib';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a Cognito User Pool
    const userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      autoVerify: {
        email: true,
      },
      signInAliases: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      standardAttributes: {
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        email: {
          required: true,
          mutable: true,
        },
      },
    });

    // used by the landing page frontend, this would be used to register new users, and support sign-in and sign-out.
    const webUserPoolClient = new UserPoolClient(this, 'WebUserPoolClient', {
      userPool,
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // we will use this later to programmatically create new users using the admin flow.
    const serverUserPoolClient = new UserPoolClient(
      this,
      `${props.stageName}-ServerUserPoolClient`,
      {
        userPool,
        authFlows: {
          adminUserPassword: true,
        },
        preventUserExistenceErrors: true,
      }
    );

    this.cognitoUserPool = userPool;
    this.webUserPoolClient = webUserPoolClient;
    this.serverUserPoolClient = serverUserPoolClient;
  }
}

// to interact with a Cognito User Pool, you also need to create app clients. Each client can be configured with different authentication flows, token expiration, and which attributes it's allowed to read or write.
