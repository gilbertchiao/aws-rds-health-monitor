# AWS RDS Health Monitor - Development Guidelines

This document provides guidelines and instructions for developing and maintaining the AWS RDS Health Monitor project.

## Build/Configuration Instructions

### Prerequisites
- Node.js (v20.x or later required)
- npm (v6.x or later)
- AWS CLI configured with appropriate permissions

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### AWS Configuration
The Lambda function requires appropriate IAM permissions to access RDS resources and send emails via SES:
- `rds:DescribeDBInstances`
- `ses:SendEmail`

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

### Deployment
To deploy the Lambda function to AWS:

1. Create a deployment package:
   ```bash
   zip -r function.zip index.js node_modules
   ```

2. Deploy using AWS CLI:
   ```bash
   aws lambda create-function \
     --function-name rds-health-monitor \
     --runtime nodejs20.x \
     --handler index.handler \
     --zip-file fileb://function.zip \
     --role arn:aws:iam::<account-id>:role/<role-name>
   ```

3. Update an existing function:
   ```bash
   aws lambda update-function-code \
     --function-name rds-health-monitor \
     --zip-file fileb://function.zip
   ```

## Testing Information

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

### Adding New Tests
1. Create test files in the `tests` directory with the `.test.js` extension
2. Follow the existing test patterns:
   - Use descriptive test names
   - Mock AWS services using Jest's built-in mocking functionality
   - Test both success and error scenarios
   - Test edge cases (e.g., invalid email addresses, empty responses)

### Example Test
Here's a simple example of how to test a Lambda function that interacts with AWS services:

```javascript
const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { handler } = require('../index');

// Mock the RDSClient and its send method
jest.mock('@aws-sdk/client-rds', () => {
  const mockSend = jest.fn();
  return {
    RDSClient: jest.fn().mockImplementation(() => ({
      send: mockSend
    })),
    DescribeDBInstancesCommand: jest.fn().mockImplementation((params) => params)
  };
});

// Mock the SESClient and its send method
jest.mock('@aws-sdk/client-ses', () => {
  const mockSend = jest.fn();
  return {
    SESClient: jest.fn().mockImplementation(() => ({
      send: mockSend
    })),
    SendEmailCommand: jest.fn().mockImplementation((params) => params)
  };
});

describe('RDS Monitor Lambda Function', () => {
  // Get references to the mocked send methods
  const mockRdsSend = new RDSClient().send;
  const mockSesSend = new SESClient().send;

  // Clean up mocks after each test
  afterEach(() => {
    mockRdsSend.mockReset();
    mockSesSend.mockReset();
  });

  test('should return RDS instances when successful', async () => {
    // Mock data that the AWS SDK would return
    const mockRdsInstances = {
      DBInstances: [
        {
          DBInstanceIdentifier: 'test-db',
          DBInstanceStatus: 'available',
          Engine: 'mysql',
          EngineVersion: '8.0.23',
          AllocatedStorage: 20
        }
      ]
    };

    // Mock successful responses
    mockRdsSend.mockResolvedValueOnce(mockRdsInstances);
    mockSesSend.mockResolvedValueOnce({ MessageId: 'test-message-id' });

    // Call the handler function
    const result = await handler({}, {});

    // Verify the response
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.instances).toHaveLength(1);
    expect(body.instances[0].identifier).toBe('test-db');
  });
});
```

## Code Style and Development Guidelines

### Code Style
- The project uses ESLint for code style enforcement
- Run linting with: `npm run lint`
- Key style rules:
  - Use single quotes for strings
  - Use 2 spaces for indentation
  - Always use semicolons
  - No trailing commas

### Project Structure
- `index.js` - Main Lambda handler function
- `tests/` - Test files
- `.junie/` - Project documentation

### Best Practices
1. **Error Handling**
   - Always use try/catch blocks in async functions
   - Return appropriate HTTP status codes
   - Include meaningful error messages

2. **Logging**
   - Use console.log for information that would be useful in CloudWatch Logs
   - Include relevant context in log messages

3. **AWS SDK Usage**
   - The project uses AWS SDK v3 modular clients (@aws-sdk/client-rds, @aws-sdk/client-ses)
   - Use async/await with the send() method for cleaner code
   - Mock AWS services in tests to avoid actual API calls

4. **Security**
   - Never hardcode AWS credentials
   - Use IAM roles with least privilege
   - Validate and sanitize all inputs

### Debugging
- Local testing can be done using the AWS SAM CLI
- Use CloudWatch Logs for monitoring in production
- Set the log level appropriately based on the environment
