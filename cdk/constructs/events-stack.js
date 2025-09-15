import { Stack } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';

export class EventsStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    console.info(`${props.serviceName}-${props.stageName}-order-events`);
    const orderEventBus = new EventBus(this, 'OrderEventBus', {
      eventBusName: `${props.serviceName}-${props.stageName}-order-events`,
    });

    this.orderEventBus = orderEventBus;
  }
}
