# `@hyperledger-cacti/cactus-test-plugin-ledger-connector-ethereum`

## Overview

This package groups integration tests for the Ethereum ledger connector and Cacti API server. It exposes no production runtime functionality.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

The package is configured as part of the Cacti monorepo:

```sh
yarn configure
```

## API Summary

The package public API is limited to test support. Its maintained functionality is the integration-test suite under [`src/test/typescript/`][package-doc-src-test-typescript].


## Usage

``` sh
# In root project dir
npx jest cactus-test-plugin-ledger-connector-ethereum
```

## FAQ

### **What is a dedicated test package for?**

This is a dedicated test package meaning that it verifies the integration between two packages that are somehow dependent on each other and therefore these tests cannot be added properly in the child package due to circular dependency issues and it would not be fitting to add it in the parent because the child package's tests should not be held by the parent as a matter of principle.

## Testing

From the repository root, run:

```sh
yarn test:jest:all packages/cactus-test-plugin-ledger-connector-ethereum/src/test/typescript
```

## Contributing

See [CONTRIBUTING.md][package-doc-contributing-md] for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE][package-doc-license] file.

[package-doc-src-test-typescript]: ./src/test/typescript/
[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
