// An aspect lets you iterate through this tree and do something as you visit each node, by implementing a visit(node) function.

import { Function } from 'aws-cdk-lib/aws-lambda';

export class LambdaEnvVarsAspect {
  constructor(serviceName) {
    this.serviceName = serviceName;
  }

  visit(node) {
    if (node instanceof Function) {
      if (this.stageName === 'prod') {
        node.addEnvironment('LOG_LEVEL', 'info');
      } else {
        node.addEnvironment('LOG_LEVEL', 'debug');
      }
      node.addEnvironment('serviceName', this.serviceName);
    }
  }
}
