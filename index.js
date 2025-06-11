// Lambda function for monitoring AWS RDS instances
// This is a simple implementation that can be expanded as needed

const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

/**
 * Validates if a string is a valid email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid, false otherwise
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sends an email with RDS instance status information
 * @param {Array} instances - Array of RDS instance information
 * @returns {Promise<Object>} - Promise resolving to the SES send result
 */
const sendStatusEmail = async (instances) => {
  // Get email recipients from environment variable
  const allRecipients = process.env.EMAIL_RECIPIENTS ? process.env.EMAIL_RECIPIENTS.split(',') : [];

  // Filter out invalid email addresses
  const recipients = allRecipients.filter(email => {
    const isValid = isValidEmail(email.trim());
    if (!isValid) {
      console.log(`Skipping invalid email address: ${email}`);
    }
    return isValid;
  });

  if (recipients.length === 0) {
    console.log('No valid email recipients configured. Skipping email notification.');
    return null;
  }

  const sesClient = new SESClient();

  // Create HTML table for RDS instances
  const instanceRows = instances.map(instance => `
    <tr>
      <td>${instance.identifier}</td>
      <td>${instance.status}</td>
      <td>${instance.engine}</td>
      <td>${instance.engineVersion}</td>
      <td>${instance.allocatedStorage} GB</td>
    </tr>
  `).join('');

  const htmlBody = `
    <html>
      <head>
        <style>
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
        </style>
      </head>
      <body>
        <h2>RDS Instance Status Report</h2>
        <table>
          <tr>
            <th>Identifier</th>
            <th>Status</th>
            <th>Engine</th>
            <th>Version</th>
            <th>Storage</th>
          </tr>
          ${instanceRows}
        </table>
      </body>
    </html>
  `;

  const params = {
    Source: process.env.EMAIL_SENDER || 'no-reply@example.com',
    Destination: {
      ToAddresses: recipients,
    },
    Message: {
      Subject: {
        Data: 'RDS Instance Status Report',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `RDS Instance Status Report\n\n${instances.map(instance =>
            `${instance.identifier}: ${instance.status} (${instance.engine} ${instance.engineVersion}, ${instance.allocatedStorage} GB)`
          ).join('\n')}`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log('Email sent successfully:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Monitors RDS instances and returns their status
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Promise<Object>} - Promise resolving to an object containing RDS instance statuses
 */
exports.handler = async (event, context) => {
  try {
    const rdsClient = new RDSClient();

    // Get all RDS instances
    const command = new DescribeDBInstancesCommand({});
    const data = await rdsClient.send(command);

    // Extract relevant information
    const instances = data.DBInstances.map(instance => ({
      identifier: instance.DBInstanceIdentifier,
      status: instance.DBInstanceStatus,
      engine: instance.Engine,
      engineVersion: instance.EngineVersion,
      allocatedStorage: instance.AllocatedStorage
    }));

    console.log('RDS Instances:', JSON.stringify(instances, null, 2));

    // Send email with RDS instance status
    try {
      await sendStatusEmail(instances);
      console.log('Email notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue execution even if email fails
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'RDS instances retrieved successfully',
        instances,
        emailSent: true
      })
    };
  } catch (error) {
    console.error('Error monitoring RDS instances:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error monitoring RDS instances',
        error: error.message
      })
    };
  }
};
