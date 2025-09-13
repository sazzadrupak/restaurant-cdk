import { CfnOutput } from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class WafStack extends Construct {
  constructor(scope, id, props) {
    super(scope, id);

    this.webAcl = new wafv2.CfnWebACL(this, 'ApiWebACL', {
      scope: 'REGIONAL', // For API Gateway
      defaultAction: {
        allow: {},
      },
      description: 'Web ACL for API Gateway with rate limiting',
      name: `${props.stageName}-ApiWebACL`,
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          action: {
            block: {
              customResponse: {
                responseCode: 429,
                customResponseBodyKey: 'RateLimitExceeded',
              },
            },
          },
          statement: {
            rateBasedStatement: {
              limit: 100, // requests per 5-minute period
              aggregateKeyType: 'IP',
              scopeDownStatement: undefined, // Apply to all requests
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
            sampledRequestsEnabled: true,
          },
        },
      ],
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${props.stageName}-ApiWebACL`,
        sampledRequestsEnabled: true,
      },
      customResponseBodies: {
        RateLimitExceeded: {
          contentType: 'APPLICATION_JSON',
          content: JSON.stringify({
            message: 'Rate limit exceeded',
            error: 'TooManyRequests',
          }),
        },
      },
    });

    // Construct the correct ARN for the API Gateway stage
    const stageArn = props.apiGateway.getStageArnForWaf(props.region);

    // Associate the Web ACL with the API Gateway
    const webAclAssociation = new wafv2.CfnWebACLAssociation(
      this,
      'ApiWebACLAssociation',
      {
        resourceArn: stageArn, // API Gateway ARN
        webAclArn: this.webAcl.attrArn,
      }
    );

    // Ensure the association is created after the Web ACL
    webAclAssociation.node.addDependency(props.api.deploymentStage);

    new CfnOutput(this, 'WebACLArn', {
      value: this.webAcl.attrArn,
      description: 'Web ACL ARN for API Gateway',
    });

    new CfnOutput(this, 'WebACLId', {
      value: this.webAcl.ref,
      description: 'Web ACL ID for API Gateway',
    });
  }
}
