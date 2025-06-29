#!/bin/bash

# Ensure AWS CLI is installed
if ! command -v aws &> /dev/null
then
    echo "aws CLI is not installed or not in the PATH. Please install it and try again."
    exit 1
fi

# Ensure jq is installed
if ! command -v jq &> /dev/null
then
    echo "jq is not installed or not in the PATH. Please install it and try again."
    exit 1
fi

# Get CloudFormation stack name and region as arguments
STACK_NAME=$1
REGION=$2
AWS_PROFILE=$3

if [ -z "$STACK_NAME" ] || [ -z "$REGION" ] || [ -z "$AWS_PROFILE" ]
then
    echo "Usage: $0 <STACK_NAME> <REGION>"
    exit 1
fi

echo "Running..."

# Create or overwrite .env file
> .env

# Iterate through Lambda functions created by CloudFormation stack
for LAMBDA_ARN in $(aws cloudformation describe-stack-resources --profile "$AWS_PROFILE" --stack-name "$STACK_NAME" --region "$REGION" | jq -r '.StackResources[] | select(.ResourceType=="AWS::Lambda::Function") .PhysicalResourceId')
do
    # Fetch function configuration
    FUNCTION_CONFIG=$(aws lambda get-function-configuration --profile "$AWS_PROFILE" --function-name "$LAMBDA_ARN" --region "$REGION")

    # Check if Environment.Variables exists before processing
    if echo "$FUNCTION_CONFIG" | jq -e '.Environment.Variables' > /dev/null; then
        # Extract environment variables
        ENV_VARS=$(echo "$FUNCTION_CONFIG" | jq -r '.Environment.Variables')

        # Iterate through the environment variables and write to .env file only if it doesn't already exist
        for KEY in $(echo "$ENV_VARS" | jq -r 'keys[]'); do
            VALUE=$(echo "$ENV_VARS" | jq -r --arg KEY "$KEY" '.[$KEY]')

            # Check if the key already exists in the .env file
            if ! grep -q "^$KEY=" .env; then
                echo "$KEY=$VALUE" >> .env
            fi
        done
    fi
done

echo ".env file has been created/updated with environment variables from Lambda functions."
