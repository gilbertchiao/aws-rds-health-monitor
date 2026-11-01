# Contributing

Thanks for your interest in improving AWS RDS Health Monitor. This is a small,
single-purpose Lambda function, so contributions are expected to stay focused.

## Before You Start

- **Bugs**: open a [bug report](https://github.com/gilbertchiao/aws-rds-health-monitor/issues/new?template=bug_report.yml).
- **Features**: open a [feature request](https://github.com/gilbertchiao/aws-rds-health-monitor/issues/new?template=feature_request.yml)
  first so we can discuss scope before you write code.
- **Security issues**: do **not** open an issue. Follow [SECURITY.md](SECURITY.md).

## Development Setup

Requirements: Node.js 20.x or later (matches the Lambda runtime) and npm.

```bash
git clone https://github.com/gilbertchiao/aws-rds-health-monitor.git
cd aws-rds-health-monitor
npm ci
npm run lint
npm test
```

Tests mock the AWS SDK, so no AWS credentials are needed to run them.

## Making Changes

1. Fork the repository and create a branch from `main`.
2. Keep each pull request focused on one change.
3. Add or update tests in `tests/` for any behaviour change.
4. Make sure `npm run lint` and `npm test` pass locally. CI runs both on
   Node 20.x and 22.x and must be green before merging.
5. Do not commit `node_modules/`, `coverage/`, `function.zip` or any `.env` files.

## Code Style

ESLint enforces the style. The key rules are:

- Single quotes, semicolons, 2-space indentation, no trailing commas
- CommonJS modules (`require` / `module.exports`)
- AWS SDK v3 modular clients only (`@aws-sdk/client-*`)
- `console.log` / `console.error` are fine; they go to CloudWatch Logs

See [.junie/guidelines.md](.junie/guidelines.md) for more detail.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add instance class to the status report
fix: skip instances with empty identifiers
docs: clarify SES sandbox requirements
chore: bump aws-sdk clients
```

Pull requests are squash-merged, so the PR title becomes the commit title.

## Dependencies

Dependabot handles routine dependency bumps. Please do not open manual
dependency-update PRs unless they fix a specific bug or security issue.
Avoid adding new runtime dependencies; the deployment package should stay small.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
