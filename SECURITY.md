# Security Policy

## Supported Versions

This project is a single AWS Lambda function distributed from the `main` branch.
Only the latest commit on `main` is supported with security fixes.

| Version        | Supported          |
| -------------- | ------------------ |
| `main` (HEAD)  | :white_check_mark: |
| Older commits  | :x:                |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately through
[GitHub Private Vulnerability Reporting](https://github.com/gilbertchiao/aws-rds-health-monitor/security/advisories/new).
This keeps the report confidential until a fix is available.

When reporting, please include:

- A description of the issue and its potential impact
- Steps to reproduce, or a proof-of-concept if available
- The affected file(s) and commit hash
- Any suggested mitigation, if you have one

### What to Expect

- Acknowledgement of your report within **7 days**
- An initial assessment and expected timeline within **14 days**
- A fix released on `main` and a GitHub Security Advisory published once resolved
- Credit in the advisory, unless you prefer to remain anonymous

This is a personal open-source project maintained on a best-effort basis.
Response times are targets, not guarantees.

## Scope

In scope:

- The Lambda handler in `index.js`
- Build and CI configuration in `.github/`
- Dependency vulnerabilities that are exploitable in this project's context

Out of scope:

- Misconfiguration of your own AWS account (IAM, SES, Lambda settings)
- Vulnerabilities in AWS services themselves (report those to
  [AWS Security](https://aws.amazon.com/security/vulnerability-reporting/))
- Dependency advisories with no reachable code path in this project

## Security Considerations for Deployers

This function reads RDS metadata and sends email via SES. When deploying it:

- **Least privilege IAM**: grant only `rds:DescribeDBInstances`, `ses:SendEmail`
  and CloudWatch Logs permissions, as shown in the README. Do not attach broad
  managed policies such as `AmazonRDSFullAccess`.
- **No hardcoded credentials**: the function relies on the Lambda execution role.
  Never place AWS access keys in environment variables or source code.
- **Email recipients**: the status report contains RDS instance identifiers,
  engine versions and storage sizes. Restrict `EMAIL_RECIPIENTS` to trusted
  addresses and verify them in SES.
- **CloudWatch Logs**: the function logs instance metadata. Apply an appropriate
  log retention period and restrict read access to the log group.
- **Dependency updates**: Dependabot is enabled on this repository. Redeploy
  the function after dependency updates are merged so the running Lambda
  package does not fall behind.
