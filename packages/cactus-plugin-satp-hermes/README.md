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
yarn run configure
```

For Solidity smart contract development (SATP bridge development) install Foundry:
```sh
curl -L https://foundry.paradigm.xyz | bash
foundryup
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

<img src="./images/SATP-Protocol.png" alt="drawing" width="700"/>

### Crash Recovery Integration
The crash recovery protocol ensures session consistency across all stages of SATP. Each session's state, logs, hashes, timestamps, and signatures are stored and recovered using the following mechanisms:

1. **Session Logs**: A persistent log storage mechanism ensures crash-resilient state recovery.
2. **Consistency Checks**: Ensures all messages and actions are consistent across both gateways and the connected ledgers.
3. **Stage Recovery**: Recovers interrupted sessions by validating logs, hashes, timestamps, and signatures to maintain protocol integrity.
4. **Rollback Operations**: In the event of a timeout or irrecoverable failure, rollback messages ensure the state reverts back the current stage.
5. **Logging & Proofs**: The database is leveraged for state consistency and proof accountability across gateways.

Refer to the [Crash Recovery Sequence](https://datatracker.ietf.org/doc/html/draft-belchior-satp-gateway-recovery) for more details.

### Application-to-Gateway API (API Type 1)
The gateway’s Business Layer Orchestrator (BLO) exposes an API with the following endpoints:

#### API Endpoints
- **Transact**
  - Triggers a SATP transaction.

- **GetStatus**
  - Reads status information of a specific SATP session.

- **GetAllSessions**
  - Retrieves all session IDs known by the bridge.


### Gateway-to-Gateway API (API Type 2)
This plugin in the Gateway-to-Gateway communication uses grpc.

There are Client and Server GRPC Endpoints for each type of message detailed in the SATP protocol:

  - Stage 0:
    - NewSessionRequest
    - NewSessionResponse
    - PreSATPTransferRequest
    - PreSATPTransferResponse
  - Stage 1:
    - TransferProposalRequestMessage
    - TransferProposalReceiptMessage
    - TransferCommenceRequestMessage
    - TransferCommenceResponseMessage
  - Stage 2:
    - LockAssertionRequestMessage
    - LockAssertionReceiptMessage
  - Stage 3:
    - CommitPreparationRequestMessage
    - CommitReadyResponseMessage
    - CommitFinalAssertionRequestMessage
    - CommitFinalAcknowledgementReceiptResponseMessage
    - TransferCompleteRequestMessage

There are also defined the endpoints for the crash recovery procedure (there is still missing the endpoint to receive the Rollback mesage):
  - RecoverV1Message
  - RecoverUpdateV1Message
  - RecoverUpdateAckV1Message
  - RecoverSuccessV1Message
  - RollbackV1Message

## Use case
Alice and Bob, in blockchains A and B, respectively, want to make a transfer of an asset from one to the other. Gateway A represents the gateway connected to Alice's blockchain. Gateway B represents the gateway connected to Bob's blockchain. Alice and Bob will run SATP, which will execute the transfer of the asset from blockchain A to blockchain B. The above endpoints will be called in sequence. Notice that the asset will first be locked on blockchain A and a proof is sent to the server-side. Afterward, the asset on the original blockchain is extinguished, followed by its regeneration on blockchain B.

### Role of Crash Recovery in SATP
In SATP, crash recovery ensures that asset transfers remain consistent and fault-tolerant across distributed ledgers. Key features include:
- **Session Recovery**: Gateways synchronize state using recovery messages, ensuring continuity after failures.
- **Rollback**: For irrecoverable errors, rollback procedures ensure safe reversion to previous states.
- **Fault Resilience**: Enables recovery from crashes while maintaining the integrity of ongoing transfers.

These features enhance reliability in scenarios where network or gateway disruptions occur during asset transfers.

### Future Work

- **Single-Gateway Topology Enhancement**  
  The crash recovery and rollback mechanisms are implemented for configurations where client and server data are handled separately. For single-gateway setups, where both client and server data coexist in session, the current implementation of fetching a single log may not suffice. This requires to fetch multiple logs (X logs) `recoverSessions()` to differentiate and handle client and server-specific data accurately, to reconstruct the session back after the crash.

## Running the tests
### **Unit**
- #### **SATP Services***
  - [SATP services test](./src/test/typescript/unit/services.test.ts)
- #### **Gateway**
  - [Gateway runner instantiation test](./src/test/typescript/unit/SATPGatewayRunner-instantiation.test.ts)
- #### **Crash Management**
  - [Crash detection using cron jobs](./src/test/typescript/unit/crash-management/cron-job.test.ts)
  - [Rollback services test](./src/test/typescript/unit/crash-management/rollback-factory.test.ts)
  - [Crash scenarios test](./src/test/typescript/unit/crash-management/scenarios.test.ts)

### **Integration**
- #### **End-to-End**
  - [End-to-end testing of a single SATP Gateway realizing a cross-chain tranfer](./src/test/typescript/integration/satp-e2e-transfer-1-gateway.test.ts)
  - [End-to-end testing of a single SATP Gateways realizing a cross-chain tranfer utilizing the Hyperledger Cacti Api Server](./src/test/typescript/integration/satp-e2e-transfer-1-gateway-with-api-server.test.ts)
  - [End-to-end testing of a single SATP Gateway realizing a cross-chain tranfer - Docker](./src/test/typescript/integration/satp-e2e-transfer-1-gateways-dockerization.test.ts)
  - [End-to-end testing of a single SATP Gateway realizing a cross-chain tranfer with Bungee Proofs](./src/test/typescript/integration/satp-e2e-transfer-1-gateway-with-bungee.test.ts)
  - [End-to-end testing of two SATP Gateways realizing a cross-chain tranfer](./src/test/typescript/integration/satp-e2e-transfer-2-gateway.test.ts)
  - [End-to-end testing of two SATP Gateways realizing a cross-chain tranfer, gateway create their OAPI server](./src/test/typescript/integration/satp-e2e-transfer-2-gateways-openapi.test.ts)
  - [End-to-end testing of two SATP Gateways realizing a cross-chain tranfer utilizing the Hyperledger Cacti Api Server](./src/test/typescript/integration/satp-e2e-transfer-2-gateway-with-api-server.test.ts)
  - [End-to-end testing of a single SATP Gateway realizing a cross-chain tranfer - Docker](./src/test/typescript/integration/satp-e2e-transfer-2-gateways-dockerization.test.ts)
- #### **Bridge**
  - [Besu Bridge Test](./src/test/typescript/integration/bridge/besu-bridge.test.ts)
  - [Fabric Bridge Test](./src/test/typescript/integration/bridge/fabric-bridge.test.ts)
  - [Ethereum Bridge Test](./src/test/typescript/integration/bridge/ethereum-bridge.test.ts)
- #### **Crash Recovery**
  - [Stage 1 recovery test](./src/test/typescript/integration/recovery/recovery-stage-1.test.ts)
  - [Stage 2 recovery test](./src/test/typescript/integration/recovery/recovery-stage-2.test.ts)
  - [Stage 3 recovery test](./src/test/typescript/integration/recovery/recovery-stage-3.test.ts)
  - [Stage 0 rollback test](./src/test/typescript/integration/rollback/rollback-stage-0.test.ts)
  - [Stage 1 rollback test](./src/test/typescript/integration/rollback/rollback-stage-1.test.ts)
  - [Stage 2 rollback test](./src/test/typescript/integration/rollback/rollback-stage-2.test.ts)
  - [Stage 3 rollback test](./src/test/typescript/integration/rollback/rollback-stage-3.test.ts)
- #### **Business Logic Orchestrator**
  - [Blo OAPI test](./src/test/typescript/integration/gateway-blo.test.ts)
- #### **Gateway**
  - [Gateway Startup Test](./src/test/typescript/integration/gateway-init-startup.test.ts)

  
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

## Containerization

### Building the container image locally

In the project root directory run these commands on the terminal:

```sh
yarn configure
yarn lerna run build:bundle --scope=@hyperledger/cactus-plugin-satp-hermes
```

### Build the image:
 
  For stable builds:
   ```
  yarn docker:build:stable
   ```
  For dev builds:
   ```
    yarn docker:build:dev
   ```
  
Run the image:

```sh
docker run \
  -it \
  satp-hermes-gateway
```

Alternatively you can use `docker compose up --build` from within the package directory or if you
prefer to run it from the project root directory then:

```sh
docker compose \
  --project-directory ./packages/cactus-plugin-satp-hermes/ \
  -f ./packages/cactus-plugin-satp-hermes/docker-compose.yml \
  up \
  --build
```

To push the current version to the official repo, run (tested in MacOS):
```sh
IMAGE_NAME=ghcr.io/hyperledger-cacti/satp-hermes-gateway
DEV_TAG="$(date -u +"%Y-%m-%dT%H-%M-%S")-dev-$(git rev-parse --short HEAD)"

echo "Building Docker image with name: $IMAGE_NAME:$DEV_TAG"

docker build  \
  --file ./packages/cactus-plugin-satp-hermes/satp-hermes-gateway.Dockerfile \
  ./packages/cactus-plugin-satp-hermes/ \
  --tag $IMAGE_NAME:$DEV_TAG \
  --tag $IMAGE_NAME:latest
```

> The `--build` flag is going to save you 99% of the time from docker compose caching your image builds against your will or knowledge during development.

## Contributing
We welcome contributions to Hyperledger Cacti in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](https://github.com/hyperledger/cacti/blob/main/CONTRIBUTING.md "CONTRIBUTING.md") to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.
