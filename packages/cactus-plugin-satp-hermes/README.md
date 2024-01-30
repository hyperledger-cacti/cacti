# @hyperledger/cactus-plugin-satp-hermes
The package provides `Hyperledger Cacti` a way to standardize cross-chain transactions between ledgers. Using this we can perform:
- A unidirectional atomic asset transfer between 2 parties in different ledgers.
- Lock of the asset in the source ledger and proof is sent to the counterparty.
- Extinguishment of the asset in the source blockchain and regeneration of the asset in the recipient blockchain.
- This package implements [Hermes as defined in the paper](https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337), namely the gateway paradigm and crash recovery.

At the moment, we assume a crash-fault environment under some assumptions detailed in section [Assumptions](#assumptions)
## Summary

  - [Assumptions](#assumptions)
  - [Getting Started](#getting-started)
  - [Architecture](#architecture)
  - [Use Case](#use-case)
  - [Running the tests](#running-the-tests)
  - [Usage](#usage)


## Assumptions
Regarding the crash recovery procedure in place, at the moment we only support crashes of gateways under certain assumptions detailed as follows:
  - Gateways crash only after receiving a message (and before sending the next one)
  - Gateways crash only after logging to the Log Storage the previously received message
  - Gateways never loose their long term keys
  - Gateways do not have byzantine behavior
  - Gateways are assumed to always recover from a crash

We will be working on reducing these assumptions and making the system more resilient to faults.

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

### Entities
Firstly let us identify the different entities involved in the protocol and what is their function:
- Two gateways in each side of the protocol: they implement endpoints to exchange the messages defined in the protocol.
- Ledgers connectors in each side (each connected to a different gateway): they expose the API so that gateways can interact the respective ledgers (e.g., locking, deleting and creating assets).
- SQLite3 database: persistent log and proofs storage in each gateway.
- IPFS connector: is exposed the API so that both gateways have access to the same structure. This is used to store the hashes and signatures of the logs and proofs, so that accountability is guaranteed.

The sequence diagram of SATP is pictured below.

![satp-sequence-diagram](https://i.imgur.com/SOdXFEt.png)

### Application-to-Gateway API (API Type 1)
We

### Gateway-to-Gateway API (API Type 2)
This plugin uses OpenAPI to generate the API paths.
There are Client and Server Endpoints for each type of message detailed in the SATP protocol:

  - TransferInitializationV1Request
  - TransferInitializationV1Response
  - TransferCommenceV1Request
  - TransferCommenceV1Response
  - LockEvidenceV1Request
  - LockEvidenceV1Response
  - CommitPreparationV1Request
  - CommitPreparationV1Response
  - CommitFinalV1Request
  - CommitFinalV1Response
  - TransferCompleteV1Request
  - ClientV1Request

There are also defined the endpoints for the crash recovery procedure (there is still missing the endpoint to receive the Rollback mesage):
  - RecoverV1Message
  - RecoverUpdateV1Message
  - RecoverUpdateAckV1Message
  - RecoverSuccessV1Message
  - RollbackV1Message

## Use case
Alice and Bob, in blockchains A and B, respectively, want to make a transfer of an asset from one to the other. Gateway A represents the gateway connected to Alice's blockchain. Gateway B represents the gateway connected to Bob's blockchain. Alice and Bob will run SATP, which will execute the transfer of the asset from blockchain A to blockchain B. The above endpoints will be called in sequence. Notice that the asset will first be locked on blockchain A and a proof is sent to the server-side. Afterward, the asset on the original blockchain is extinguished, followed by its regeneration on blockchain B.

## Running the tests

[A test of the entire protocol with manual calls to the methods, i.e. without ledger connectors and Open API.](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/satp.test.ts)

[A test of the entire protocol using Open API but with no ledger connectors.](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/satp-api-call.test.ts)

[A test of the entire protocol with ledger connectors (Fabric and Besu) and Open API.](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/satp-api-call-with-ledger-connector.test.ts)

[A test with a simulated crash of the client gateway after the transfer initiation flow.](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/client-crash-after-transfer-initiation.test.ts)

[A test with a simulated crash of the client gateway after the lock of the asset in the source blockchain (Fabric).](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/client-crash-after-lock-asset.test.ts)

[A test with a simulated crash of the client gateway after the deletion of the asset in the source blockchain (Fabric).](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/client-crash-after-delete-asset.test.ts)

[A test with a simulated crash of the server gateway after the creation of the the asset in the recipient blockchain (Besu).](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/server-crash-after-create-asset.test.ts)

[A test with a simulated crash of the server gateway after the transfer initiation flow.](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/server-crash-after-transfer-initiation.test.ts)

[A test with a rollback after a timeout (client crashed).](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/satp-rollback.test.ts)

[A test with a backup gateway resuming the protocol after the client gateway crashed.](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-satp-hermes/src/test/typescript/integration/backup-gateway-after-client-crash.test.ts)

For developers that want to test separate steps/phases of the SATP protocol, please refer to [these](https://github.com/hyperledger/cactus/blob/2e94ef8d3b34449c7b4d48e37d81245851477a3e/packages/cactus-plugin-satp-hermes/src/test/typescript/unit/) test files (client and server side along with the recovery procedure).

## Usage

Let us consider two gateways. The client gateway connected to Hyperledger Fabric and the server gateway connected to Hyperledger Besu. Let us also consider:

  - A Hyperledger Fabric API client on URL: http://localhost:8045
  - A Hyperledger Besu API client on URL: http://localhost:8046
  - An IPFS API client on URL: http://localhost:8047
  - The local databases configuration provided in the file [knex.config.ts](https://github.com/hyperledger/cactus/blob/main/packages/cactus-plugin-satp-hermes/src/test/typescript/knex.config.ts)

Then the SATP gateways should be created as follows:

```typescript
const clientGatewayOptions: IFabricSATPGatewayConstructorOptions = {
  name: "cactus-plugin#clientOdapGateway",
  dltIDs: ["DLT2"],
  instanceId: uuidv4(),
  ipfsPath: "http://localhost:8047",
  fabricPath: "http://localhost:8045",
  fabricSigningCredential: fabricSigningCredential,
  fabricChannelName: fabricChannelName,
  fabricContractName: fabricContractName,
  clientHelper: new ClientGatewayHelper(),
  serverHelper: new ServerGatewayHelper(),
};

const serverGatewayOptions: IBesuSATPGatewayConstructorOptions = {
  name: "cactus-plugin#serverOdapGateway",
  dltIDs: ["DLT1"],
  instanceId: uuidv4(),
  ipfsPath: "http://localhost:8047",
  besuPath: "http://localhost:8046",
  besuWeb3SigningCredential: besuWeb3SigningCredential,
  besuContractName: besuContractName,
  besuKeychainId: besuKeychainId,
  clientHelper: new ClientGatewayHelper(),
  serverHelper: new ServerGatewayHelper(),
};
   
  const clientGateway = new FabricSATPGateway(clientGatewayOptions);
  const serverGateway = new BesuSATPGateway(serverGatewayOptions);
```

Note that these gateways are extensions of the [default SATP Gateway class](https://github.com/hyperledger/cactus/blob/main/packages/cactus-plugin-satp-hermes/src/main/typescript/gateway/plugin-satp-gateway.ts), that implements the gateway functionality. Each of these extensions implements ledger-specific operations.

## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](https://github.com/hyperledger/cactus/blob/main/CONTRIBUTING.md "CONTIRBUTING.md") to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.
