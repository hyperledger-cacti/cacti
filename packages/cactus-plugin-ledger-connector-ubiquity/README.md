# `@hyperledger/cactus-plugin-ledger-connector-ubiquity <!-- omit in toc -->
This plugin defines interfaces for developers to use a wrapped version of the Ubiquity SDK. Ubiquity is a high performance, multi-chain API for accessing blockchain data, i.e., provides one API to access multiple protocols: https://ubiquity.docs.blockdaemon.com/swagger-ui

This API complements Cactus current connector offering by allowing to connect seamlessly to a multitude of public blockchains. Although it can be considered a ledger connector, for now 

## Supported Functionality
-Read from smart contracts and addresses from 10+ different blockchains.

## Usage
TBD

## Installation

**npm**

```sh
npm install @hyperledger/cactus-plugin-ledger-connector-ubiquity
```

**yarn**

```sh
yarn add @hyperledger/cactus-plugin-ledger-connector-ubiquity
```

Rename .env.example to .env and poopulate the environment variables. Alternatively, setup the AUTH_TOKEN environment variable (will be used to set up the auth token for the Ubiquity client).

### Using as a Library
TBD

## TODO
- Implement IPluginLedgerConnectorInterface with perhaps State pattern
- Containerize the plugin
- Add unit and integration tests
- Support full historical data across all Ubiquity supported protocols. 
- Deploy public blockchain nodes on-the-go

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
The development of this plugin is supported by Blockdaemon