import { Stack } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a DynamoDB table for restaurants
    const restaurantsTable = new Table(this, 'RestaurantsTable', {
      partitionKey: { name: 'name', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // The id partition key is a hash of the invocation event. When our function starts processing the event, the status is set to IN_PROGRESS.
    // When the invocation completes (ie, the message is processed), the status is changed to COMPLETED and the function's return value is recorded in the data attribute.
    // If the same event is received before this record expires, then the previous return value will be returned without processing the same event again. Hence achieving idempotency.
    const idempotencyTable = new Table(this, 'IdempotencyTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiration',
    });

    this.restaurantsTable = restaurantsTable;
    this.idempotencyTable = idempotencyTable;
  }
}
