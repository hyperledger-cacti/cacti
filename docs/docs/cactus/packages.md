# Cacti Packages

The Hyperledger Cacti ecosystem is modular and composed of numerous NPM packages. This page provides a comprehensive index of active packages categorized by their intended audience.

For detailed documentation, click the package name to view its canonical README file in the project repository.

## Core and SDK Packages

| Package Name | Description |
| :--- | :--- |
| [cactus-common](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-common) | Foundational utilities and shared typings used across the Cacti framework. |
| [cactus-core](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-core) | Core implementations and base classes for plugins and ledgers. |
| [cactus-core-api](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-core-api) | Interfaces and abstract classes defining the Cacti plugin architecture. |
| [cactus-api-client](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-api-client) | Default API client library for application developers interacting with Cacti. |
| [cactus-plugin-satp-hermes](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-satp-hermes) | Secure Asset Transfer Protocol implementation for atomic asset transfers. |
| [cactus-plugin-bungee-hermes](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-bungee-hermes) | Extension package providing Bungee routing capabilities for Hermes. |
| [cacti-ledger-browser](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-ledger-browser) | Ledger browser utility for viewing cross-chain transactions. |

## Connectors, Plugins, and Infrastructure

| Package Name | Description |
| :--- | :--- |
| [cactus-cmd-api-server](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-cmd-api-server) | The centralized API server responsible for orchestrating Cacti plugins. |
| [cacti-copm-core](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-copm-core) | Core operations and lifecycle management subsystem logic. |
| [cacti-plugin-copm-corda](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-plugin-copm-corda) | Operations lifecycle management plugin for the Corda ledger. |
| [cacti-plugin-copm-fabric](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-plugin-copm-fabric) | Operations lifecycle management plugin for the Hyperledger Fabric ledger. |
| [cacti-plugin-weaver-driver-fabric](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-plugin-weaver-driver-fabric) | Interoperability driver enabling Weaver functionality on Fabric. |
| [cactus-plugin-ledger-connector-besu](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-ledger-connector-besu) | Standardized connector for interacting with Hyperledger Besu. |
| [cactus-plugin-ledger-connector-corda](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-ledger-connector-corda) | Standardized connector for interacting with R3 Corda. |
| [cactus-plugin-ledger-connector-ethereum](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-ledger-connector-ethereum) | Standardized connector for interacting with Ethereum networks. |
| [cactus-plugin-ledger-connector-fabric](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-ledger-connector-fabric) | Standardized connector for interacting with Hyperledger Fabric. |
| [cacti-plugin-ledger-connector-stellar](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-plugin-ledger-connector-stellar) | Standardized connector for interacting with the Stellar network. |
| [cactus-plugin-keychain-memory](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-keychain-memory) | In-memory keychain plugin for local development and testing environments. |
| [cactus-plugin-persistence-ethereum](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-persistence-ethereum) | Persistence plugin for syncing Ethereum ledger state to a database. |
| [cactus-plugin-persistence-fabric](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-persistence-fabric) | Persistence plugin for syncing Fabric ledger state to a database. |

## Test and Tooling Packages

| Package Name | Description |
| :--- | :--- |
| [cactus-test-tooling](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-test-tooling) | Shared testing utilities and mock ledger environments for integration testing. |
| [cactus-test-api-client](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-test-api-client) | Testing harnesses for API client interactions. |
| [cactus-test-cmd-api-server](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-test-cmd-api-server) | Testing harnesses for the main API server. |
| [cacti-copm-test](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-copm-test) | Testing suites specific to COPM subsystem functionality. |
