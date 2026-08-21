# `@hyperledger-cacti/cactus-plugin-htlc-eth-besu`

## Overview

This plugin deploys and operates hash time-locked contracts on Besu through a registered Cacti Besu ledger connector.

**Target Audience:**

- [x] Developers
- [x] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-plugin-htlc-eth-besu
```

## API Summary

The public API exports the HTLC plugin, its factory and options, generated OpenAPI client types, and contract artifacts. See [`public-api.ts`](./src/main/typescript/public-api.ts) for the maintained export surface.

Allows `Cacti` to interact with HTLC contract manager. 


## Summary

  - [Getting Started](#getting-started)
  - [Installing](#installing)
  - [Runing the tests](#running-the-tests)
  - [Contributing](#contributing)
  - [License](#license)


## Usage
The smart contracts and rationalle ane explained in detail in <a href=https://medium.com/@rafaelbelchior/dlt-interoperability-and-more-%EF%B8%8F-24-privacy-preserving-cross-chain-atomic-swaps-bonus-lets-ff99a90714de> this Medium article </a>.

These instructions will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Installing

Install Foundry: https://book.getfoundry.sh/getting-started/installation

Steps to compile the project: `forge build`.



## Testing

The tests can be found in @hyperledger/cactus-test-htlc-eth-besu. To run this, in the root project execute:

```sh
npm run test:plugin-htlc-besu
```

To run the solidity tests (within the root directory of this package):
`forge test --match-contract PrivateHashTimeLockTest`

To run a specific function:
`forge test --match-contract PrivateHashTimeLockTest --match-test testDeployment`

Run ALL the solidity tests: `forge test -vvvv`


## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

## Nohoist configuration
Foundry uses ``forge-std``and ``ds-test``modules for testing purposes. Given that Foundry cannot access files outside of the project, we use nohoist to force lerna to download the packages within the Forge project directory:

``
    "nohoist": [
      "**/iroha-helpers",
      "**/forge-std",
      "**/forge-std/**"
    ]
  },
``

If in the future Forge supports importing Solidity files from outside the project, the imports/re-mappings can be updated and the nohoist configuration removed.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.