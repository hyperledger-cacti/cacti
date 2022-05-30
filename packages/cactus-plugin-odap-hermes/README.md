# @hyperledger/cactus-plugin-odap-hermes
The package provides `Cactus` a way to standardize cross-chain transactions between two ledgers (Fabric and Besu in this implementation). Using this we could perform:
- Make unidirectional atomic asset transfer between 2 parties in different ledgers.
- Lock of the asset in the source ledger and proof is sent to the counterparty.
- Extinguishment of the asset in the source blockchain and regeneration of the asset in the recipient blockchain.
## Summary

  - [Getting Started](#getting-started)
  - [Architecture](#architecture)
  - [Use Case](#use-case)
  - [Running the tests](#running-the-tests)
  - [Usage](#usage)

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Prerequisites

In the root of the project to install the dependencies execute the command:
```sh
npm run configure
```

Know how to use the following plugins of the project:

- [cactus-plugin-ledger-connector-fabric](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-fabric)
- [cactus-plugin-ledger-connector-besu](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-besu)
- [cactus-plugin-object-store-ipfs](https://github.com/hyperledger/cactus/tree/main/extensions/cactus-plugin-object-store-ipfs)

## Architecture

The sequence diagram of ODAP is pictured above.

![odap-sequence-diagram](https://mermaid.ink/img/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG4gICAgcGFydGljaXBhbnQgRW5kVXNlclxuICAgIHBhcnRpY2lwYW50IENsaWVudE9EQVBHYXRld2F5XG4gICAgcGFydGljaXBhbnQgSHlwZXJsZWRnZXJGYWJyaWNcbiAgICBwYXJ0aWNpcGFudCBTZXJ2ZXJPREFQR2F0ZXdheVxuICAgIHBhcnRpY2lwYW50IEh5cGVybGVkZ2VyQmVzdVxuICAgIEVuZFVzZXItPj5DbGllbnRPREFQR2F0ZXdheTogc2VuZCBjbGllbnQgcmVxdWVzdFxuICAgIENsaWVudE9EQVBHYXRld2F5LT4-U2VydmVyT0RBUEdhdGV3YXk6ICB0cmFuc2ZlciBpbml0aWF0aW9uIHJlcXVlc3RcbiAgICBTZXJ2ZXJPREFQR2F0ZXdheS0tPj5DbGllbnRPREFQR2F0ZXdheTogdHJhbnNmZXIgaW5pdGlhdGlvbiBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgdHJhbnNmZXIgY29tbWVuY2UgcmVxdWVzdFxuICAgIFNlcnZlck9EQVBHYXRld2F5LS0-PkNsaWVudE9EQVBHYXRld2F5OiB0cmFuc2ZlciBjb21tZW5jZSBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-Pkh5cGVybGVkZ2VyRmFicmljOiBsb2NrIGFzc2V0XG4gICAgSHlwZXJsZWRnZXJGYWJyaWMtLT4-Q2xpZW50T0RBUEdhdGV3YXk6IHRyYW5zYWN0aW9uIHJlY2VpcHQgZm9yIGxvY2tpbmcgYXNzZXRcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgbG9jayBldmlkZW5jZSByZXF1ZXN0XG4gICAgU2VydmVyT0RBUEdhdGV3YXktPj5DbGllbnRPREFQR2F0ZXdheTogbG9jayBldmlkZW5jZSBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgY29tbWl0IHByZXBhcmUgcmVxdWVzdFxuICAgIFNlcnZlck9EQVBHYXRld2F5LS0-PkNsaWVudE9EQVBHYXRld2F5OiBjb21taXQgcHJlcGFyZSBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-Pkh5cGVybGVkZ2VyRmFicmljOiBkZWxldGUgYXNzZXRcbiAgICBIeXBlcmxlZGdlckZhYnJpYy0tPj5DbGllbnRPREFQR2F0ZXdheTogdHJhbnNhY3Rpb24gcmVjZWlwdCBmb3IgZGVsZXRpbmcgYXNzZXRcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgY29tbWl0IGZpbmFsIHJlcXVlc3RcbiAgICBTZXJ2ZXJPREFQR2F0ZXdheS0-Pkh5cGVybGVkZ2VyQmVzdTogY3JlYXRlIGFzc2V0XG4gICAgSHlwZXJsZWRnZXJCZXN1LS0-PlNlcnZlck9EQVBHYXRld2F5OiB0cmFuc2FjdGlvbiByZWNlaXB0IGZvciBjcmVhdGluZyBhc3NldFxuICAgIFNlcnZlck9EQVBHYXRld2F5LS0-PkNsaWVudE9EQVBHYXRld2F5OiBjb21taXQgZmluYWwgYWNrXG4gICAgQ2xpZW50T0RBUEdhdGV3YXktPj5TZXJ2ZXJPREFQR2F0ZXdheTogIHRyYW5zZmVyIGNvbXBsZXRlXG4gICAgQ2xpZW50T0RBUEdhdGV3YXktLT4-RW5kVXNlcjogIHNlbmQgY2xpZW50IGFja1xuXG4iLCJtZXJtYWlkIjp7InRoZW1lIjoiZGVmYXVsdCJ9LCJ1cGRhdGVFZGl0b3IiOnRydWUsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjp0cnVlfQ "odap-sequence-diagram")

### API Endpoints
This plugin uses OpenAPI to generate the API paths. At the moment, only the server endpoints are defined:

- Phase1TransferInitiationV1
- Phase2TransferCommenceV1
- Phase2LockEvidenceV1
- Phase3CommitPreparationV1
- Phase3CommitFinalV1
- Phase3TransferCompleteV1
- SendClientRequestV1
## Use case
Alice and Bob, in blockchains A and B, respectively, want to make a transfer of an asset from one to the other. Gateway A represents the gateway connected to Alice's blockchain. Gateway B represents the gateway connected to Bob's blockchain. Alice and Bob will run ODAP, which will execute the transfer of the asset from blockchain A to blockchain B. The above endpoints will be called in sequence. Notice that the asset will first be locked on blockchain A and a proof is sent to the server-side. Afterward, the asset on the original blockchain is extinguished, followed by its regeneration on blockchain B.

## Running the tests

A test with ledger connectors (Fabric and Besu):

https://github.com/hyperledger/cactus/blob/main/packages/cactus-plugin-odap-hermes/src/test/typescript/integration/odap/odap-api-call-with-ledger-connector.test.ts

Without ledger connectors:

https://github.com/hyperledger/cactus/blob/main/packages/cactus-plugin-odap-hermes/src/test/typescript/integration/odap/odap-api-call.test.ts

For developers who would want to test separate steps of odap please refer to other test files in:

https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-odap-hermes/src/test/typescript/integration/odap

## Usage

Let us consider:

- A Hyperledger Fabric API client on URL: http://localhost:8045
- A Hyperledger Besu API client on URL: http://localhost:8046
- An IPFS API client on URL: http://localhost:8047

Then the ODAP gateway should be created as follows:

```
const odapPluginOptions: OdapGatewayConstructorOptions = {
     name: "cactus-plugin#odapGateway",
     dltIDs: ["supported dlts here"],
     instanceId: uuidV4(),    
     ipfsPath: http://localhost:8047,  
     besuAssetID: "whatever",
     besuPath: http://localhost:8046,
     besuWeb3SigningCredential:
     besuWeb3SigningCredential,
     besuContractName: besuContractName,
     besuKeychainId: besuKeychainId,
     fabricPath: http://localhost:8045,
     fabricSigningCredential: fabricSigningCredential,
     fabricChannelName: fabricChannelName,
     fabricContractName: fabricContractName,
     fabricAssetID: fabricAssetID,
   };
   
   const odapGateway = new OdapGateway(odapPluginOptions);
```

## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](https://github.com/hyperledger/cactus/blob/main/CONTRIBUTING.md "CONTIRBUTING.md") to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.



