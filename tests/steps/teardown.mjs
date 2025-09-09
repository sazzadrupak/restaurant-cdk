import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

export const an_authenticated_user = async (user) => {
  const cognito = new CognitoIdentityProviderClient();

  let req = new AdminDeleteUserCommand({
    UserPoolId: process.env.cognito_user_pool_id,
    Username: user.username,
  });
  await cognito.send(req);

  console.log(`[${user.username}] - user deleted`);
};
