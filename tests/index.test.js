// 只取用於取得 mock send 方法的 client；Command 類別由下方 jest.mock 直接定義，不需匯入
const { RDSClient } = require('@aws-sdk/client-rds');
const { SESClient } = require('@aws-sdk/client-ses');
const { handler } = require('../index');

// Mock the RDSClient and its send method
jest.mock('@aws-sdk/client-rds', () => {
  const mockSend = jest.fn();
  return {
    RDSClient: jest.fn().mockImplementation(() => ({
      send: mockSend
    })),
    DescribeDBInstancesCommand: jest.fn().mockImplementation(params => params)
  };
});

// Mock the SESClient and its send method
jest.mock('@aws-sdk/client-ses', () => {
  const mockSend = jest.fn();
  return {
    SESClient: jest.fn().mockImplementation(() => ({
      send: mockSend
    })),
    SendEmailCommand: jest.fn().mockImplementation(params => params)
  };
});

describe('RDS Monitor Lambda Function', () => {
  // Get references to the mocked send methods
  const mockRdsSend = new RDSClient().send;
  const mockSesSend = new SESClient().send;

  // Set up environment variables for testing
  const originalEnv = process.env;

  // Clean up mocks after each test
  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.EMAIL_RECIPIENTS = 'test@example.com';
  });

  afterEach(() => {
    mockRdsSend.mockReset();
    mockSesSend.mockReset();
    // Restore original environment
    process.env = originalEnv;
  });

  test('should return RDS instances and send email when successful', async () => {
    // Mock data that the AWS SDK would return
    const mockRdsInstances = {
      DBInstances: [
        {
          DBInstanceIdentifier: 'test-db-1',
          DBInstanceStatus: 'available',
          Engine: 'mysql',
          EngineVersion: '8.0.23',
          AllocatedStorage: 20
        },
        {
          DBInstanceIdentifier: 'test-db-2',
          DBInstanceStatus: 'available',
          Engine: 'postgres',
          EngineVersion: '13.4',
          AllocatedStorage: 50
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
    expect(body.message).toBe('RDS instances retrieved successfully');
    expect(body.instances).toHaveLength(2);
    expect(body.emailSent).toBe(true);

    // Check first instance details
    expect(body.instances[0].identifier).toBe('test-db-1');
    expect(body.instances[0].status).toBe('available');
    expect(body.instances[0].engine).toBe('mysql');

    // Check second instance details
    expect(body.instances[1].identifier).toBe('test-db-2');
    expect(body.instances[1].engine).toBe('postgres');

    // Verify that SES was called with the correct parameters
    expect(mockSesSend).toHaveBeenCalledTimes(1);
    const sesCommand = mockSesSend.mock.calls[0][0];
    expect(sesCommand.Destination.ToAddresses).toContain('test@example.com');
    expect(sesCommand.Message.Subject.Data).toBe('RDS Instance Status Report');
  });

  test('should continue execution when email sending fails', async () => {
    // Mock RDS success but SES failure
    const mockRdsInstances = {
      DBInstances: [
        {
          DBInstanceIdentifier: 'test-db-1',
          DBInstanceStatus: 'available',
          Engine: 'mysql',
          EngineVersion: '8.0.23',
          AllocatedStorage: 20
        }
      ]
    };

    mockRdsSend.mockResolvedValueOnce(mockRdsInstances);
    mockSesSend.mockRejectedValueOnce(new Error('SES error'));

    // Call the handler function
    const result = await handler({}, {});

    // Verify the response - should still be successful
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.message).toBe('RDS instances retrieved successfully');
    expect(body.instances).toHaveLength(1);
    expect(body.emailSent).toBe(true); // We still report emailSent as true even if it failed
  });

  test('should skip email when no recipients configured', async () => {
    // Remove email recipients
    process.env.EMAIL_RECIPIENTS = '';

    const mockRdsInstances = {
      DBInstances: [
        {
          DBInstanceIdentifier: 'test-db-1',
          DBInstanceStatus: 'available',
          Engine: 'mysql',
          EngineVersion: '8.0.23',
          AllocatedStorage: 20
        }
      ]
    };

    mockRdsSend.mockResolvedValueOnce(mockRdsInstances);

    // Call the handler function
    const result = await handler({}, {});

    // Verify the response
    expect(result.statusCode).toBe(200);

    // SES should not be called
    expect(mockSesSend).not.toHaveBeenCalled();
  });

  test('should filter out invalid email addresses', async () => {
    // Set up a mix of valid and invalid email addresses
    process.env.EMAIL_RECIPIENTS = 'valid@example.com,invalid-email,another.valid@example.org, ,test@domain';

    const mockRdsInstances = {
      DBInstances: [
        {
          DBInstanceIdentifier: 'test-db-1',
          DBInstanceStatus: 'available',
          Engine: 'mysql',
          EngineVersion: '8.0.23',
          AllocatedStorage: 20
        }
      ]
    };

    mockRdsSend.mockResolvedValueOnce(mockRdsInstances);
    mockSesSend.mockResolvedValueOnce({ MessageId: 'test-message-id' });

    // Call the handler function
    const result = await handler({}, {});

    // Verify the response
    expect(result.statusCode).toBe(200);

    // Verify that SES was called with only the valid email addresses
    expect(mockSesSend).toHaveBeenCalledTimes(1);
    const sesCommand = mockSesSend.mock.calls[0][0];

    // Should include valid emails
    expect(sesCommand.Destination.ToAddresses).toContain('valid@example.com');
    expect(sesCommand.Destination.ToAddresses).toContain('another.valid@example.org');

    // Should not include invalid emails
    expect(sesCommand.Destination.ToAddresses).not.toContain('invalid-email');
    expect(sesCommand.Destination.ToAddresses).not.toContain('test@domain');
    expect(sesCommand.Destination.ToAddresses).not.toContain(' ');

    // Should have exactly 2 valid email addresses
    expect(sesCommand.Destination.ToAddresses.length).toBe(2);
  });

  test('should skip email when all recipients are invalid', async () => {
    // Set up only invalid email addresses
    process.env.EMAIL_RECIPIENTS = 'invalid-email,test@domain,not-an-email, ';

    const mockRdsInstances = {
      DBInstances: [
        {
          DBInstanceIdentifier: 'test-db-1',
          DBInstanceStatus: 'available',
          Engine: 'mysql',
          EngineVersion: '8.0.23',
          AllocatedStorage: 20
        }
      ]
    };

    mockRdsSend.mockResolvedValueOnce(mockRdsInstances);

    // Call the handler function
    const result = await handler({}, {});

    // Verify the response
    expect(result.statusCode).toBe(200);

    // SES should not be called when all recipients are invalid
    expect(mockSesSend).not.toHaveBeenCalled();
  });

  test('should handle RDS errors properly', async () => {
    // Mock an error response
    mockRdsSend.mockRejectedValueOnce(new Error('AWS RDS error'));

    // Call the handler function
    const result = await handler({}, {});

    // Verify the error response
    expect(result.statusCode).toBe(500);

    const body = JSON.parse(result.body);
    expect(body.message).toBe('Error monitoring RDS instances');
    expect(body.error).toBe('AWS RDS error');

    // SES should not be called if RDS fails
    expect(mockSesSend).not.toHaveBeenCalled();
  });
});
