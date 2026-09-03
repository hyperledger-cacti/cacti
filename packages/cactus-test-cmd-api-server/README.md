# `@hyperledger-cacti/cactus-test-cmd-api-server`

## Overview

This package contains integration-test support for the Cacti command API server. It is intended for repository development and is not an application runtime dependency.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

The package is configured as part of the Cacti monorepo:

```sh
yarn configure
```

## API Summary

The package public API is limited to utilities required by its integration tests. See [`public-api.ts`][package-doc-src-main-typescript-public-api-ts] for the maintained export surface.

This is the test package for the package that's called `cactus-cmd-api-server`

## Usage

```
// TODO: DEMONSTRATE API
```

## FAQ

### **What is a dedicated test package for?**

This is a dedicated test package meaning that it verifies the integration between two packages that are somehow dependent on each other and therefore these tests cannot be added properly in the child package due to circular dependency issues and it would not be fitting to add it in the parent because the child package's tests should not be held by the parent as a matter of principle.

## Testing

From the repository root, run:

```sh
yarn test:jest:all packages/cactus-test-cmd-api-server/src/test/typescript
```

## Contributing

See [CONTRIBUTING.md][package-doc-contributing-md] for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE][package-doc-license] file.

[package-doc-src-main-typescript-public-api-ts]: ./src/main/typescript/public-api.ts
[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
