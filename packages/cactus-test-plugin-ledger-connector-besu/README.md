# `@hyperledger-cacti/cactus-test-plugin-ledger-connector-besu`

## Overview

This package groups integration tests for the Besu ledger connector and Cacti API server. It exposes no production runtime functionality.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

The package is configured as part of the Cacti monorepo:

```sh
yarn configure
```

## API Summary

The package public API is limited to test support. Its maintained functionality is the integration-test suite under [`src/test/typescript/`](./src/test/typescript/).

## Usage

Run this package only from a configured Cacti source checkout.

## Testing

From the repository root, run:

```sh
yarn test:jest:all packages/cactus-test-plugin-ledger-connector-besu/src/test/typescript
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

This package is designed to hold test cases verifying the correct operation of
the code in the package of similar name: `@hyperledger/cactus-plugin-ledger-connector-besu`.

It contains no code that you would find useful in a production deployment.
