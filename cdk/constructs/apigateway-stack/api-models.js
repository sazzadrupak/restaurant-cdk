import { Model } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ApiModels extends Construct {
  constructor(scope, id, props) {
    super(scope, id);

    this.searchRestaurantsRequestModel = new Model(
      this,
      'SearchRestaurantsRequestModel',
      {
        restApi: props.api,
        contentType: 'application/json',
        modelName: 'SearchRestaurantsRequestModel',
        schema: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            count: { type: 'integer', minimum: 1, maximum: 50 },
          },
          required: ['theme'],
          additionalProperties: false,
        },
      }
    );

    this.placeOrderRequestModel = new Model(this, 'PlaceOrderRequestModel', {
      restApi: props.api,
      contentType: 'application/json',
      modelName: 'PlaceOrderRequestModel',
      schema: {
        type: 'object',
        properties: {
          restaurantName: { type: 'string' },
        },
        required: ['restaurantName'],
        additionalProperties: false,
      },
    });
  }
}
