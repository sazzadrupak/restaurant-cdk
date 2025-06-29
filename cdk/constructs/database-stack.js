import { Stack } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a DynamoDB table for restaurants
    this.restaurantsTable = new Table(this, 'RestaurantsTable', {
      partitionKey: { name: 'name', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
  }
}
