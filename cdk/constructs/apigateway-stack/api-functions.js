import { Fn } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class ApiFunctions extends Construct {
  constructor(scope, id, props) {
    super(scope, id);

    // Get Index Function
    this.getIndexFunction = new NodejsFunction(this, 'GetIndex', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/get-index.mjs',
      bundling: {
        format: 'esm',
        commandHooks: {
          afterBundling(inputDir, outputDir) {
            return [
              `mkdir ${outputDir}/static`,
              `cp ${inputDir}/static/index.html ${outputDir}/static/index.html`,
            ];
          },
          beforeBundling() {},
          beforeInstall() {},
        },
      },
      environment: {
        restaurants_api: Fn.sub(
          `https://\${${props.apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props.stageName}/restaurants`
        ),
        cognito_user_pool_id: props.cognitoUserPool.userPoolId,
        cognito_client_id: props.webUserPoolClient.userPoolClientId,
      },
    });

    // Get Restaurants Function
    this.getRestaurantsFunction = new NodejsFunction(this, 'GetRestaurants', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/get-restaurants.mjs',
      environment: {
        service_name: props.serviceName,
        ssm_stage_name: props.ssmStageName,
        restaurants_table: props.restaurantsTable.tableName,
        cloudfront_url: props.cloudfrontUrl,
      },
    });

    // Grant permissions
    props.restaurantsTable.grantReadData(this.getRestaurantsFunction);
    this.getRestaurantsFunction.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameters*'],
        resources: [
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/serviceQuotas`
          ),
        ],
      })
    );

    // Search Restaurants Function
    this.searchRestaurantsFunction = new NodejsFunction(
      this,
      'SearchRestaurants',
      {
        runtime: Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: 'functions/search-restaurants.mjs',
        environment: {
          service_name: props.serviceName,
          ssm_stage_name: props.ssmStageName,
          restaurants_table: props.restaurantsTable.tableName,
          cloudfront_url: props.cloudfrontUrl,
        },
      }
    );

    // Grant permissions
    props.restaurantsTable.grantReadData(this.searchRestaurantsFunction);
    this.searchRestaurantsFunction.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameters*'],
        resources: [
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/serviceQuotas`
          ),
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/search-restaurants/secretString`
          ),
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/cloudfront/url`
          ),
        ],
      })
    );

    this.searchRestaurantsFunction.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [Fn.ref(props.kmsArnParameter.logicalId)], // Use the passed parameter
      })
    );

    // Add API invoke policy to getIndex function
    const apiInvokePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['execute-api:Invoke'],
      resources: [
        Fn.sub(
          `arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${${props.apiLogicalId}}/${props.stageName}/GET/restaurants`
        ),
      ],
    });
    this.getIndexFunction.role?.addToPrincipalPolicy(apiInvokePolicy);
  }
}
