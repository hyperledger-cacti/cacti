# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit
guidelines.

## 3.0.1

- Initial Canton connector with transaction submission, party discovery, and
  active-contract queries.
- Added the generated OpenAPI client, operation-specific authorization scopes,
  bounded requests, and Canton LocalNet integration coverage.
- Requires a caller-supplied `commandId` so retries are deduplicated by Canton.
- Requires HTTPS for the JSON Ledger API, with an explicit loopback-only HTTP
  exception for local development.
- Bounds pending upstream operations and makes `shutdown()` terminal.
- Reads active contracts with one uncached Ledger API request per query.
- Loads the Wallet SDK through its ESM entry point and requires Node.js 20 or
  later.
