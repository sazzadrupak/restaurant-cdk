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
    const placeOrderIntegration = new LambdaIntegration(
      functions.placeOrderFunction
    );

    // Root resource - GET /
    api.root.addMethod('GET', getIndexIntegration, {
      // Override throttling for GET / endpoint
      throttle: {
        rateLimit: 50, // Lower limit for index page
        burstLimit: 100,
      },
    });

    // Restaurants resource - /restaurants
    const restaurantsResource = api.root.addResource('restaurants');

    // GET /restaurants
    restaurantsResource.addMethod('GET', getRestaurantsIntegration, {
      authorizationType: AuthorizationType.IAM,
      throttle: {
        rateLimit: 200, // Higher limit for restaurant list
        burstLimit: 400,
      },
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
      throttle: {
        rateLimit: 150, // Medium limit for search
        burstLimit: 300,
      },
    });

    api.root.addResource('orders').addMethod('POST', placeOrderIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.cognitoAuthorizer.ref,
      },
      requestModels: {
        'application/json': models.placeOrderRequestModel,
      },
      requestValidatorOptions: {
        validateRequestBody: true,
        validateRequestParameters: false,
      },
      throttle: {
        rateLimit: 100, // Limit for placing orders
        burstLimit: 200,
      },
    });
  }
}
