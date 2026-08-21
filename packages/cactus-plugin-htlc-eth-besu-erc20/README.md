# `@hyperledger-cacti/cactus-plugin-htlc-eth-besu-erc20`

## Overview

This plugin deploys and operates ERC-20 hash time-locked contracts on Besu through a registered Cacti Besu ledger connector.

**Target Audience:**

- [x] Developers
- [x] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-plugin-htlc-eth-besu-erc20
```

## API Summary

The public API exports the ERC-20 HTLC plugin, its factory and options, generated OpenAPI client types, and contract artifacts. See [`public-api.ts`](./src/main/typescript/public-api.ts) for the maintained export surface.

Allows Cactus nodes to interact with HTLC contracts with ERC-20 Tokens

## Summary

  - [Getting Started](#getting-started)
  - [Runing the tests](#running-the-tests)
  - [Deployment](#deployment)
  - [Built With](#built-with)
  - [Contributing](#contributing)
  - [License](#license)

## Usage

### Installing

In a Cactus root directory, need execute:
```
   npm run configure
```
This command compile and build the project.

## Testing

For test all the plugin we have @hyperledger/cactus-test-plugin-htlc-eth-besu-erc20
For execute the test plugin, can execute in root directory: 
```
  npm run test:plugin-htlc-besu-erc20
```

## Contact
* mailing list: [cacti@lists.lfdecentralizedtrust.org](mailto:cacti@lists.lfdecentralizedtrust.org)
* rocketchat channel: [https://chat.hyperledger.org/channel/cactus](https://chat.hyperledger.org/channel/cactus).

## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [contributing](../../CONTRIBUTING.md) guidelines to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.
