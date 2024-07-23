# @hyperledger-cacti/cacti-copm-core

This package defines the common types, interfaces, and endpoints for the
COPM module to be used by Digital Ledger-specific implementations.

These endpoints require specific chaincode and weaver relays to be deployed on the network.
Please see https://hyperledger-cacti.github.io/cacti/weaver/introduction/.

Endpoint documentation:
https://jenniferlianne.github.io/cacti/references/openapi/cacti-copm-core_openapi/

# Usage

## Installation

Yarn: 

    yarn add --exact @hyperledger-cacti/cacti-copm-core


# Development

When implementing a new distributed ledger, the following interfaces must be implemented:

- DLTransactionContext:  Implements running a transaction on the local network
- DLRemoteTransactionContext: Uses the weaver relays to run a transaction on another network
- DLTransactionContextFactory: Factory to return either local or remote context for the specific DLT.