# `@hyperledger-cacti/cactus-test-plugin-htlc-eth-besu`

> Integration tests for the Besu HTLC plugin.

## Overview

This package contains the integration and API-surface tests for
[`@hyperledger-cacti/cactus-plugin-htlc-eth-besu`](../cactus-plugin-htlc-eth-besu/README.md).
The suite validates the plugin's OpenAPI contract and the initialize, contract,
status, refund, and withdrawal endpoints.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

This package is maintained as part of the Cacti monorepo. Configure the
repository from its root before running the tests:

```sh
yarn configure
```

## Configuration

The integration tests create their required plugin and ledger test fixtures.
No separate runtime configuration API is exported by this package.

## API Summary

The package does not export a public API. Its
[`public-api.ts`](./src/main/typescript/public-api.ts) file is intentionally
empty, and the package is used to group integration tests.

## Usage

Use this package through its tracked integration tests rather than as a
runtime dependency.

## Testing

The CI workflow runs the tracked Jest integration tests with this pattern:

```text
packages/cactus-test-plugin-htlc-eth-besu/src/test/typescript/(unit|integration|benchmark)/.*/*.test.ts
```

Use the repository's `test:jest:all` runner from the project root when
executing the same pattern locally.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in
the [LICENSE](../../LICENSE) file.
