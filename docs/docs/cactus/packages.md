# Cacti Packages

The Hyperledger Cacti ecosystem is modular and composed of numerous NPM packages. This page provides a comprehensive index of active packages categorized by their intended audience.

For detailed documentation, click the package name to view its canonical README rendered on this site.

## Core and SDK Packages

| Package Name | Description |
| :--- | :--- |
| [cactus-common](packages/cactus-common.md) | Foundational utilities and shared typings used across the Cacti framework. |
| [cactus-core](packages/cactus-core.md) | Core implementations and base classes for plugins and ledgers. |
| [cactus-core-api](packages/cactus-core-api.md) | Interfaces and abstract classes defining the Cacti plugin architecture. |
| [cactus-api-client](packages/cactus-api-client.md) | Default API client library for application developers interacting with Cacti. |
| [cacti-ledger-browser](packages/cacti-ledger-browser.md) | React application for visualizing ledger data exposed through Cacti. |

## Connectors, Plugins, and Infrastructure

| Package Name | Description |
| :--- | :--- |
| [cactus-plugin-satp-hermes](packages/cactus-plugin-satp-hermes.md) | Secure Asset Transfer Protocol implementation for atomic asset transfers. |
| [cactus-plugin-bungee-hermes](packages/cactus-plugin-bungee-hermes.md) | Creates and combines distributed-ledger views for Cacti data-sharing flows. |
| [cactus-cmd-api-server](packages/cactus-cmd-api-server.md) | The centralized API server responsible for orchestrating Cacti plugins. |
| [cacti-copm-core](packages/cacti-copm-core.md) | Common types, services, validators, and ledger abstractions for COPM. |
| [cacti-plugin-copm-corda](packages/cacti-plugin-copm-corda.md) | Corda implementation of COPM operations. |
| [cacti-plugin-copm-fabric](packages/cacti-plugin-copm-fabric.md) | Fabric implementation of COPM operations. |
| [cacti-plugin-consortium-static](packages/cacti-plugin-consortium-static.md) | Static consortium repository with authenticated node enrollment. |
| [cacti-plugin-weaver-driver-fabric](packages/cacti-plugin-weaver-driver-fabric.md) | Interoperability driver enabling Weaver functionality on Fabric. |
| [cactus-plugin-ledger-connector-besu](packages/cactus-plugin-ledger-connector-besu.md) | Standardized connector for interacting with Hyperledger Besu. |
| [cactus-plugin-ledger-connector-corda](packages/cactus-plugin-ledger-connector-corda.md) | Standardized connector for interacting with R3 Corda. |
| [cactus-plugin-ledger-connector-ethereum](packages/cactus-plugin-ledger-connector-ethereum.md) | Standardized connector for interacting with Ethereum networks. |
| [cactus-plugin-ledger-connector-fabric](packages/cactus-plugin-ledger-connector-fabric.md) | Standardized connector for interacting with Hyperledger Fabric. |
| [cacti-plugin-ledger-connector-stellar](packages/cacti-plugin-ledger-connector-stellar.md) | Standardized connector for interacting with the Stellar network. |
| [cactus-plugin-keychain-memory](packages/cactus-plugin-keychain-memory.md) | In-memory keychain plugin for local development and testing environments. |
| [cactus-plugin-htlc-eth-besu](packages/cactus-plugin-htlc-eth-besu.md) | Hash time-locked contract operations on Besu. |
| [cactus-plugin-htlc-eth-besu-erc20](packages/cactus-plugin-htlc-eth-besu-erc20.md) | ERC-20 hash time-locked contract operations on Besu. |
| [cactus-plugin-persistence-ethereum](packages/cactus-plugin-persistence-ethereum.md) | Persistence plugin for syncing Ethereum ledger state to a database. |
| [cactus-plugin-persistence-fabric](packages/cactus-plugin-persistence-fabric.md) | Persistence plugin for syncing Fabric ledger state to a database. |

## Extensions

| Package Name | Description |
| :--- | :--- |
| [cactus-plugin-object-store-ipfs](packages/cactus-plugin-object-store-ipfs.md) | IPFS-backed implementation of the Cacti object-store interface. |
| [cactus-plugin-htlc-coordinator-besu](packages/cactus-plugin-htlc-coordinator-besu.md) | Coordinates Besu and Besu ERC-20 HTLC operations. |

## Test and Tooling Packages

| Package Name | Description |
| :--- | :--- |
| [cactus-test-tooling](packages/cactus-test-tooling.md) | Shared testing utilities and mock ledger environments for integration testing. |
| [cactus-test-api-client](packages/cactus-test-api-client.md) | Testing harnesses for API client interactions. |
| [cactus-test-cmd-api-server](packages/cactus-test-cmd-api-server.md) | Testing harnesses for the main API server. |
| [cacti-copm-test](packages/cacti-copm-test.md) | Testing suites specific to COPM subsystem functionality. |
| [cactus-test-geth-ledger](packages/cactus-test-geth-ledger.md) | Helpers for running ephemeral go-ethereum ledgers in tests. |
| [cactus-test-plugin-htlc-eth-besu](packages/cactus-test-plugin-htlc-eth-besu.md) | Integration tests for the Besu HTLC plugin. |
| [cactus-test-plugin-htlc-eth-besu-erc20](packages/cactus-test-plugin-htlc-eth-besu-erc20.md) | Integration tests for the Besu ERC-20 HTLC plugin. |
| [cactus-test-plugin-ledger-connector-besu](packages/cactus-test-plugin-ledger-connector-besu.md) | Integration tests for the Besu connector and API server. |
| [cactus-test-plugin-ledger-connector-ethereum](packages/cactus-test-plugin-ledger-connector-ethereum.md) | Integration tests for the Ethereum connector and API server. |
