import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  EventBus,
  EventField,
  Rule,
  RuleTargetInput,
} from 'aws-cdk-lib/aws-events';
import { LambdaFunction, SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Subscription, Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
// we need a way to capture events that our function is not able to process despite Lambda's built-in retries.
// the best way to do that nowadays is by using Lambda Destinations
import {
  Alarm,
  ComparisonOperator,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

export class EventsStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const orderEventBus = new EventBus(this, 'OrderEventBus', {
      eventBusName: `${props.serviceName}-${props.stageName}-order-events`,
    });
    this.orderEventBus = orderEventBus;

    // SNS topic for notifying the restaurants
    const restaurantNotificationTopic = new Topic(
      this,
      'RestaurantNotificationTopic'
    );
    const onFailureQueue = new Queue(this, 'OnFailureQueue');

    const notifyRestaurantFunction = new NodejsFunction(
      this,
      'NotifyRestaurantFunction',
      {
        runtime: Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: 'functions/notify-restaurant.mjs',
        onFailure: new SqsDestination(onFailureQueue),
        environment: {
          bus_name: orderEventBus.eventBusName,
          restaurant_notification_topic: restaurantNotificationTopic.topicArn,
          service_name: props.serviceName,
          ssm_stage_name: props.ssmStageName,
          idempotency_table: props.idempotencyTable.tableName,
        },
      }
    );
    // grants the notifyRestaurantFunction Lambda permission to publish events to the orderEventBus EventBridge event bus
    orderEventBus.grantPutEventsTo(notifyRestaurantFunction);
    // grants the notifyRestaurantFunction Lambda permission to publish messages to the restaurantNotificationTopic SNS topic
    restaurantNotificationTopic.grantPublish(notifyRestaurantFunction);
    props.idempotencyTable.grantReadWriteData(notifyRestaurantFunction);

    // Listens for specific events on the orderEventBus and routes them to the notifyRestaurantFunction
    const rule = new Rule(this, 'OrderPlacedRule', {
      eventBus: orderEventBus,
      eventPattern: {
        source: ['big-mouth-app'],
        detailType: ['order_placed'],
      },
    });
    rule.addTarget(new LambdaFunction(notifyRestaurantFunction));

    const alarmTopic = new Topic(this, 'AlarmTopic');
    alarmTopic.addSubscription(
      new EmailSubscription('gangstar08012@gmail.com')
    );

    const onFailureAlarm = new Alarm(this, 'OnFailureQueueAlarm', {
      alarmName: `[${props.stageName}][NotifyRestaurant function] Failed events detected in OnFailure destination`,
      metric: onFailureQueue.metricApproximateNumberOfMessagesVisible(),
      threshold: 0,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    onFailureAlarm.addAlarmAction(new SnsAction(alarmTopic));

    const destinationDeliveryAlarm = new Alarm(
      this,
      'DestinationDeliveryFailuresAlarm',
      {
        alarmName: `[${props.stageName}][NotifyRestaurant function] Failed to deliver events to OnFailure destination`,
        metric: notifyRestaurantFunction.metric('DestinationDeliveryFailures'),
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        threshold: 0,
        evaluationPeriods: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      }
    );
    destinationDeliveryAlarm.addAlarmAction(new SnsAction(alarmTopic));

    const isE2ETest = props.stageName.startsWith('dev');
    if (isE2ETest) {
      this.declareTestResources(restaurantNotificationTopic, orderEventBus);
    }
  }

  declareTestResources(restaurantNotificationTopic, orderEventBus) {
    const testQueue = new Queue(this, 'E2eTestQueue', {
      retentionPeriod: Duration.seconds(60),
      visibilityTimeout: Duration.seconds(1),
    });
    // to subscribe the SQS queue to the SNS topic, we need to add a resource policy to allow the SNS topic to send messages to our queue.
    testQueue.addToResourcePolicy(
      new PolicyStatement({
        actions: ['sqs:SendMessage'],
        resources: [testQueue.queueArn],
        principals: [new ServicePrincipal('sns.amazonaws.com')],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': restaurantNotificationTopic.topicArn,
          },
        },
      })
    );

    // to allow EventBridge to send messages to our SQS queue, we need to add a resource policy to allow EventBridge to send messages to our queue.
    testQueue.addToResourcePolicy(
      new PolicyStatement({
        actions: ['sqs:SendMessage'],
        resources: [testQueue.queueArn],
        principals: [new ServicePrincipal('events.amazonaws.com')],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': orderEventBus.eventBusArn,
          },
        },
      })
    );

    new Subscription(this, 'E2eTestSubscription', {
      endpoint: testQueue.queueArn,
      protocol: 'sqs',
      topic: restaurantNotificationTopic,
      // If RawMessageDelivery is true, you will get just the message body that you publish to SNS as the SQS message body.
      rawMessageDelivery: false,
      // With RawMessageDelivery set to false, this is what you receive in SQS instead:
      //       {
      //   "Type": "Notification",
      //   "MessageId": "8f14c0c1-6956-5fb7-a045-976ede2fe40b",
      //   "TopicArn": "arn:aws:sns:us-east-1:374852340823:workshop-yancui-dev-RestaurantNotificationTopic-1JUE46554XL3P",
      //   "Message": "{\"orderId\":\"4c67cf1d-9ac0-5dcb-9221-45726b7cbcc7\",\"restaurantName\":\"Pizza Planet\"}",
      //   "Timestamp": "2020-08-13T21:48:41.156Z",
      //   "SignatureVersion": "1",
      //   "Signature": "...",
      //   "SigningCertURL": "https://sns.us-east-1.amazonaws.com/...",
      //   "UnsubscribeURL": "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=..."
      // }
      // From this, we can identify where the message was sent from.
    });

    const sqsRule = new Rule(this, 'SqsRule', {
      eventBus: orderEventBus,
      eventPattern: {
        source: ['big-mouth-app'],
      },
    });

    // we added a new EventBridge rule to subscribe all events from our "big-mouth-app" application to the SQS queue
    sqsRule.addTarget(
      new SqsQueue(testQueue, {
        // EventBridge lets you transform the matched event before sending them on to the target
        message: RuleTargetInput.fromObject({
          event: {
            source: EventField.source,
            'detail-type': EventField.detailType,
            detail: EventField.fromPath('$.detail'),
          },
          eventBusName: orderEventBus.eventBusName,
        }),
      })
    );

    new CfnOutput(this, 'E2eTestQueueUrl', {
      value: testQueue.queueUrl,
    });
  }
}
