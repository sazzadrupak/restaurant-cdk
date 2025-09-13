import {
  AuthorizationType,
  LambdaIntegration,
} from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ApiResources extends Construct {
  constructor(scope, id, props) {
    super(scope, id);

    const { api, functions, authorizer, models } = props;

    // Lambda integrations
    const getIndexIntegration = new LambdaIntegration(
      functions.getIndexFunction
    );
    const getRestaurantsIntegration = new LambdaIntegration(
      functions.getRestaurantsFunction
    );
    const searchRestaurantsIntegration = new LambdaIntegration(
      functions.searchRestaurantsFunction
    );

    // Root resource - GET /
    api.root.addMethod('GET', getIndexIntegration);

    // Restaurants resource - /restaurants
    const restaurantsResource = api.root.addResource('restaurants');

    // GET /restaurants
    restaurantsResource.addMethod('GET', getRestaurantsIntegration, {
      authorizationType: AuthorizationType.IAM,
    });

    // POST /restaurants/search
    const searchResource = restaurantsResource.addResource('search');
    searchResource.addMethod('POST', searchRestaurantsIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.cognitoAuthorizer.ref,
      },
      requestModels: {
        'application/json': models.searchRestaurantsRequestModel,
      },
      requestValidatorOptions: {
        validateRequestBody: true,
        validateRequestParameters: false,
      },
    });
  }
}
