import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CachedMethods,
  CachePolicy,
  Distribution,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { RestApiOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export class CloudFrontStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { api, stageName } = props;

    const distribution = new Distribution(
      this,
      `${props.stageName}-ApiDistribution`,
      {
        defaultBehavior: {
          origin: new RestApiOrigin(api, {
            originPath: `/${stageName}`, // Important: include the stage name
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy:
            OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        additionalBehaviors: {
          '/restaurants': {
            origin: new RestApiOrigin(api, {
              originPath: `/${stageName}`, // Important: include the stage name
            }),
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
            cachePolicy: new CachePolicy(this, 'RestaurantsCachePolicy', {
              cachePolicyName: `${props.stageName}-RestaurantsCachePolicy`,
              defaultTtl: Duration.minutes(5),
              minTtl: Duration.hours(1),
              maxTtl: Duration.seconds(0),
              enableAcceptEncodingBrotlie: true,
              enableAcceptEncodingGzip: true,
            }),
          },
          '/restaurants/search': {
            origin: new RestApiOrigin(api, {
              originPath: `/${stageName}`, // Important: include the stage name
            }),
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_ALL,
            cachePolicy: CachePolicy.CACHING_DISABLED,
            originRequestPolicy:
              OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          },
          '/': {
            origin: new RestApiOrigin(api, {
              originPath: `/${stageName}`, // Important: include the stage name
            }),
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
            cachePolicy: new CachePolicy(this, 'IndexCachePolicy', {
              cachePolicyName: `${props.stageName}-IndexCachePolicy`,
              defaultTtl: Duration.minutes(1),
              maxTtl: Duration.minutes(5),
              minTtl: Duration.seconds(0),
            }),
          },
        },
      }
    );

    this.distributionUrl = `https://${distribution.distributionDomainName}`;

    new CfnOutput(this, 'DistributionUrl', {
      value: this.distributionUrl,
      description: 'CloudFront distribution URL',
    });

    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new StringParameter(this, 'CloudFrontUrl', {
      parameterName: `/${props.serviceName}/${props.ssmStageName}/cloudfront/url`,
      stringValue: this.distributionUrl,
    });
  }
}
