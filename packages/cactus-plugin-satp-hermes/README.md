# @hyperledger/cactus-plugin-satp-hermes
The package provides `Hyperledger Cacti` a way to standardize cross-chain transactions between ledgers. Using this we can perform:
- A unidirectional atomic asset transfer between 2 parties in different ledgers.
- Lock of the asset in the source ledger and proof is sent to the counterparty.
- Extinguishment of the asset in the source blockchain and regeneration of the asset in the recipient blockchain.
- This package implements [Hermes as defined in the paper](https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337), namely the gateway paradigm and crash recovery.

At the moment, we assume a crash-fault environment under some assumptions detailed in section [Assumptions](#assumptions)

## Table of Contents

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
  
## Example of a Gateway Configuration

```typescript
const gatewayConfig: {
  gid: {
    id: "gatewayId",
    name: "GatewayWithBesuConnection",
    version: [
      {
        "Core": "v02",
        "Architecture": "v02",
        "Crash": "v02"
      }
    ],
    proofID: "mockProofID10",
    address: "http://gateway1.satp-hermes" // The address of the gateway
  },
  logLevel: "TRACE",
  counterPartyGateways: [],
  localRepository: localDbKnexConfig,
  remoteRepository: remoteDbKnexConfig,
  environment: "development" || "production", // The environment in which the gateway is running
  ccConfig: { // The configuration of the cross-chain connections
    bridgeConfig: [ leafConfig... ],  // The configuration of the cross-chain connections
  },
  enableCrashRecovery: true || false, // Enable or disable crash recovery
  ontologyPath: "/opt/cacti/satp-hermes/ontologies" // The path to the ontology files
}

```

### Bridge Configuration

#### Fabric Configuration Example:
```typescript
const leafConfig = {
  networkIdentification: {
    id: "FabricLedgerTestNetwork",        // Unique identifier for the network
    ledgerType: "FABRIC_2"                // Ledger type constant for Fabric v2
  },
  userIdentity: {
    credentials: {
      certificate: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
      privateKey: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    },
    mspId: "Org2MSP",                      // Membership Service Provider ID
    type: "X.509"                          // Credential type; typically X.509 for Fabric
  },
  channelName: "mychannel",                // Fabric channel name
  targetOrganizations: [
    {
      CORE_PEER_TLS_ENABLED: "true",
      CORE_PEER_LOCALMSPID: "Org1MSP",
      CORE_PEER_TLS_CERT_FILE: "/path/to/tls/server.crt",
      ...
      ORDERER_TLS_ROOTCERT_FILE: "/path/to/orderer/tls/ca.crt"
    },
    // ... (repeat as needed for other organizations)
  ],
  caFile: "/path/to/orderer/tls/ca.crt",      // Path to Certificate Authority root cert
  ccSequence: 1,                              // Chaincode sequence/version number
  orderer: "orderer.example.com:7050",        // Orderer endpoint
  ordererTLSHostnameOverride: "orderer.example.com",
  connTimeout: 60,                            // Connection timeout in seconds
  mspId: "Org2MSP",
  connectorOptions: {
    dockerBinary: "/usr/local/bin/docker",    // Path to Docker binary (for CLI interaction)
    peerBinary: "/fabric-samples/bin/peer",   // Path to peer binary
    goBinary: "/usr/local/go/bin/go",         // Path to Go binary
    cliContainerEnv: { ... },                 // Environment variables for CLI peer container
    sshConfig: {                              // SSH access details (if interacting over SSH)
      host: "172.20.0.6",
      privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n",
      username: "root",
      port: 22
    },
    connectionProfile: { ... },               // Hyperledger Fabric connection profile object
    discoveryOptions: {
      enabled: true,
      asLocalhost: false
    },
    eventHandlerOptions: {
      strategy: "NETWORK_SCOPE_ALLFORTX",
      commitTimeout: 300
    }
  },
  wrapperContractName: "exampleWrapperContractName", // Only used if the contract was already deployed, in fabric the name identifies the contract
  claimFormats: [1]                           // Claim format identifiers (application-specific)
}
```
#### Besu Configuration Example:
```typescript
const leafConfig = {
  networkIdentification: {
    id: "BesuLedgerTestNetwork",              // Unique identifier for the network
    ledgerType: "BESU_2X"                     // Ledger type constant for Besu 2.x
  },
  signingCredential: {
    ethAccount: "0x736dC9B8258Ec5ab2419DDdffA9e1fa5C201D0b4",           // Ethereum account address
    secret: "0xc31e76f70d6416337d3a7b7a8711a43e30a14963b5ba622fa6c9dbb5b4555986", // Private key in hex
    type: "PRIVATE_KEY_HEX"
  },
  gas: 999999999999999,                       // Default gas limit for transactions
  connectorOptions: {
    rpcApiHttpHost: "http://172.20.0.6:8545", // Besu JSON-RPC HTTP endpoint
    rpcApiWsHost: "ws://172.20.0.6:8546"      // Besu JSON-RPC WebSocket endpoint
  },
  wrapperContractName: "exampleWrapperContractName", // Used if we want to use a costum name, if not given it will be provided by the leaf
  wrapperContractAddress: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B", // Only used if the contract was already deployed
  claimFormats: [1]                           // Claim format identifiers (application-specific)
}
```
#### Ethereum Configuration Example:
```typescript
const leafConfig = {
  networkIdentification: {
    id: "EthereumLedgerTestNetwork",          // Unique identifier for the network
    ledgerType: "ETHEREUM"                    // Ledger type constant for Ethereum
  },
  signingCredential: {
    ethAccount: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B", // Ethereum account address
    secret: "test",                                // Key store password or secret
    type: "GETH_KEYCHAIN_PASSWORD"                 // Credential type for geth keychain
  },
  gas: 5000000,                                   // Default gas limit for transactions
  connectorOptions: {
    rpcApiHttpHost: "http://172.20.0.7:8545",     // Ethereum JSON-RPC HTTP endpoint
    rpcApiWsHost: "ws://172.20.0.7:8546"          // Ethereum JSON-RPC WebSocket endpoint
  },
  wrapperContractName: "exampleWrapperContractName", // Used if we want to use a costum name, if not given it will be provided by the leaf
  wrapperContractAddress: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B", // Only used if the contract was already deployed
  claimFormats: [1]                               // Claim format identifiers (application-specific)
}
```
#### Notes:
- **Field values:** Replace placeholders (such as file paths, endpoint addresses, credentials, etc.) with values appropriate for your environment.
- **Security**: Credentials and secret material (certificates, private keys, etc.) must be handled securely, never checked into version control, and managed via secure secrets management.
- **claimFormats**: The claimFormats array may be customized according to the consuming application's expectations.
- For detailed schema and supported options, refer to your platform's documentation for each supported ledger.
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

## Running local Gateway with Docker Compose
# Navigate to the directory containing the docker-compose file
cd /Users/rafaelapb/Projects/blockchain-integration-framework/packages/cactus-plugin-satp-hermes/

#### Build and start containers (interactive mode)
docker-compose -f docker-compose-satp.yml up

#### Build and start containers in background (detached mode)
docker-compose -f docker-compose-satp.yml up -d

#### Stop and remove containers
docker-compose -f docker-compose-satp.yml down

#### View container logs
docker-compose -f docker-compose-satp.yml logs

#### Build or rebuild services
docker-compose -f docker-compose-satp.yml build

#### List running containers
docker-compose -f docker-compose-satp.yml ps

## Contributing
We welcome contributions to Hyperledger Cacti in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](https://github.com/hyperledger/cacti/blob/main/CONTRIBUTING.md "CONTRIBUTING.md") to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.
