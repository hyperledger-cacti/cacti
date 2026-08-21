# `@hyperledger-cacti/cactus-test-geth-ledger`

## Overview

This package provides helpers for starting and controlling ephemeral go-ethereum ledgers in Cacti integration tests.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

```sh
npm install --save-dev @hyperledger-cacti/cactus-test-geth-ledger
```

## API Summary

The public API exports the Geth test-ledger helpers and related options used by Cacti test suites. See [`public-api.ts`](./src/main/typescript/public-api.ts) for the maintained export surface.

Helpers for running test `go-ethereum` ledger in test scripts.

## Summary

- [Getting Started](#getting-started)
- [Usage](#usage)
- [Runing the tests](#running-the-tests)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Usage

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Prerequisites

In the root of the project to install the dependencies execute the command:

```sh
npm run configure
```

## Usage

- In order to start the new test ledger, you must import `GethTestLedger` and `start()` it.
- Options can be modified by supplying constructor argument object.
- See tests for more complete usage examples.

```typescript
import { GethTestLedger } from "@hyperledger-cacti/cactus-test-geth-ledger";

// You can supply empty object, suitable default values will be used.
const options = {
  containerImageName: "cactus_geth_all_in_one", // geth AIO container name
  containerImageVersion: "local-build", // geth AIO container tag
  logLevel: "info" as LogLevelDesc, // log verbosity of test class, not ethereum node!
  emitContainerLogs: false, // will print ethereum node logs here if `true`
  envVars: [], // environment variables to provide when starting the ledger
  useRunningLedger: false, // test flag to search for already running ledger instead of starting new one (only for development)
};

const ledger = new GethTestLedger(options);
await ledger.start();
// await ledger.start(true); // don't pull image, use one from local storage

// Use
const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
```

## Testing

To check that all has been installed correctly and that the test class has no errors:

- Run this command at the project's root:

```sh
npx jest cactus-test-geth-ledger
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
