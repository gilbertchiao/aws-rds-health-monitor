# AWS RDS Health Monitor

An AWS Lambda function for monitoring RDS (Relational Database Service) instances and sending status reports via email using Amazon SES (Simple Email Service).

## Overview

This Lambda function:
- Retrieves information about all RDS instances in your AWS account
- Formats this information into a readable HTML and text email
- Sends the report to configured email recipients
- Returns a JSON response with the instance information

The function is designed to be scheduled to run periodically (e.g., daily) to provide regular status updates on your RDS instances.

## Prerequisites

- Node.js (v20.x or later)
- npm (v6.x or later)
- AWS CLI configured with appropriate permissions
- An AWS account with access to Lambda, RDS, and SES services

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/aws-rds-health-monitor.git
   cd aws-rds-health-monitor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### Environment Variables

The Lambda function uses the following environment variables:

- `EMAIL_RECIPIENTS`: Comma-separated list of email addresses to receive the status reports
- `EMAIL_SENDER`: Email address to use as the sender (defaults to 'no-reply@example.com' if not set)

### AWS IAM Permissions

The Lambda function requires the following IAM permissions:

- `rds:DescribeDBInstances` - To retrieve RDS instance information
- `ses:SendEmail` - To send email notifications
- Standard Lambda logging permissions

Example IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### SES Configuration

Ensure that:
1. Amazon SES is set up in your AWS account
2. The sender email address is verified in SES
3. If your account is in the SES sandbox, all recipient email addresses must also be verified

## Deployment

### Creating a Deployment Package

1. Create a ZIP file containing the function code and dependencies:
   ```bash
   zip -r function.zip index.js node_modules
   ```

### Deploying to AWS Lambda

#### First-time Deployment

```bash
aws lambda create-function \
  --function-name rds-health-monitor \
  --runtime nodejs20.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::<account-id>:role/<role-name> \
  --environment Variables={EMAIL_RECIPIENTS=user@example.com,EMAIL_SENDER=no-reply@example.com}
```

#### Updating an Existing Function

```bash
aws lambda update-function-code \
  --function-name rds-health-monitor \
  --zip-file fileb://function.zip
```

### Setting Up a Schedule

To run the function on a schedule, create an EventBridge (CloudWatch Events) rule:

```bash
aws events put-rule \
  --name daily-rds-health-monitor \
  --schedule-expression "rate(1 day)"

aws events put-targets \
  --rule daily-rds-health-monitor \
  --targets "Id"="1","Arn"="arn:aws:lambda:<region>:<account-id>:function:rds-monitor"
```

## Testing

### Running Tests

The project uses Jest for testing. To run tests:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch
```

### Test Coverage

Test coverage reports are generated automatically when running tests. View the coverage report in the `coverage` directory.

### Linting

Run the linter to check code style:

```bash
npm run lint
```

## Email Format

The email report includes:
- A formatted HTML table with RDS instance details
- A plain text alternative for email clients that don't support HTML
- Information about each instance:
  - Identifier
  - Status
  - Database engine
  - Engine version
  - Allocated storage

## Error Handling

The function includes robust error handling:
- Validates email addresses before sending
- Continues execution even if email sending fails
- Returns appropriate error responses with status codes
- Logs detailed error information to CloudWatch Logs

## Development Guidelines

For more detailed development guidelines, see the [Development Guidelines](.junie/guidelines.md) document.

## License

[MIT](LICENSE)
