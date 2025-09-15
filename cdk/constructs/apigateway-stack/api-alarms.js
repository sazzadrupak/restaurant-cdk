import { Duration } from 'aws-cdk-lib';
import { Alarm, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { METRICS } from '../../../lib/metrics-constants.mjs';

export class ApiAlarms extends Construct {
  constructor(scope, id, props) {
    super(scope, id);

    const { functions, stageName } = props;

    // Create SNS topic for alarm notifications
    const alarmTopic = new Topic(this, 'ApiAlarmTopic', {
      displayName: `${stageName}-restaurant-api-alarms`,
    });

    // Add email subscription (replace with your email)
    if (props.alarmEmail) {
      alarmTopic.addSubscription(new EmailSubscription(props.alarmEmail));
    }

    // Helper function to create alarms
    const createFunctionAlarms = (
      functionName,
      lambdaFunction,
      config = {}
    ) => {
      const {
        errorThreshold = 5, // your function has 5 or more errors within a 5-minute period, the alarm triggers
        errorEvaluationPeriods = 2, // function must have 5+ errors in 2 consecutive 5-minute periods (10 minutes total)
        durationThreshold = 3000, // average execution time exceeds 3 seconds, the alarm triggers
        durationEvaluationPeriods = 2, // Average duration must exceed 3 seconds for 2 consecutive 5-minute periods
      } = config;

      // Error rate alarm
      const errorAlarm = new Alarm(this, `${functionName}ErrorAlarm`, {
        metric: lambdaFunction.metricErrors({
          period: Duration.minutes(5),
        }),
        threshold: errorThreshold,
        evaluationPeriods: errorEvaluationPeriods,
        treatMissingData: TreatMissingData.NOT_BREACHING, // If no data is available (function not invoked), don't trigger the alarm
        alarmDescription: `${functionName} has error rate above ${errorThreshold} in ${errorEvaluationPeriods} periods`,
      });
      errorAlarm.addAlarmAction(new SnsAction(alarmTopic));

      // Duration alarm
      const durationAlarm = new Alarm(this, `${functionName}DurationAlarm`, {
        metric: lambdaFunction.metricDuration({
          period: Duration.minutes(5),
          statistic: 'Average',
        }),
        threshold: durationThreshold,
        evaluationPeriods: durationEvaluationPeriods,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription: `${functionName} average duration above ${durationThreshold}ms`,
      });
      durationAlarm.addAlarmAction(new SnsAction(alarmTopic));

      // Throttles alarm
      const throttleAlarm = new Alarm(this, `${functionName}ThrottleAlarm`, {
        metric: lambdaFunction.metricThrottles({
          period: Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription: `${functionName} is being throttled`,
      });
      throttleAlarm.addAlarmAction(new SnsAction(alarmTopic));

      return { errorAlarm, durationAlarm, throttleAlarm };
    };

    // Create alarms for each function
    createFunctionAlarms('GetRestaurants', functions.getRestaurantsFunction, {
      durationThreshold: 2000, // maximum acceptable duration (in milliseconds) for a Lambda function execution before triggering an alarm.
    });

    createFunctionAlarms(
      'SearchRestaurants',
      functions.searchRestaurantsFunction,
      {
        durationThreshold: 3000, // 3s for search
      }
    );

    createFunctionAlarms('GetIndex', functions.getIndexFunction, {
      durationThreshold: 1000, // 1s for static content
    });

    // Custom metric alarms
    const namespace = 'RestaurantService';

    // High error rate on search
    const searchErrorRateAlarm = new Alarm(this, 'SearchErrorRateAlarm', {
      metric: functions.searchRestaurantsFunction.metric(
        METRICS.SEARCH_RESTAURANTS.ERROR,
        {
          namespace,
          period: Duration.minutes(5),
          statistic: 'Sum',
        }
      ),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High error rate on restaurant search',
    });
    searchErrorRateAlarm.addAlarmAction(new SnsAction(alarmTopic));

    // No search results alarm (might indicate data issue)
    const noResultsAlarm = new Alarm(this, 'NoSearchResultsAlarm', {
      metric: functions.searchRestaurantsFunction.metric(
        METRICS.SEARCH_RESTAURANTS.NO_RESULTS,
        {
          namespace,
          period: Duration.minutes(15),
          statistic: 'Sum',
        }
      ),
      threshold: 20, // 20 searches with no results in 15 minutes
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High number of searches returning no results',
    });
    noResultsAlarm.addAlarmAction(new SnsAction(alarmTopic));

    // API Gateway 4XX errors
    const api4xxAlarm = new Alarm(this, 'Api4xxAlarm', {
      metric: props.api.metricClientError({
        period: Duration.minutes(5),
      }),
      threshold: 50,
      evaluationPeriods: 2,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High 4XX error rate on API Gateway',
    });
    api4xxAlarm.addAlarmAction(new SnsAction(alarmTopic));

    // API Gateway 5XX errors
    const api5xxAlarm = new Alarm(this, 'Api5xxAlarm', {
      metric: props.api.metricServerError({
        period: Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 5XX errors detected',
    });
    api5xxAlarm.addAlarmAction(new SnsAction(alarmTopic));

    this.alarmTopic = alarmTopic;
  }
}
