# `@hyperledger-cacti/cactus-plugin-satp-hermes`

## Overview

The Hyperledger Cacti SATP (Secure Asset Transfer Protocol) Hermes plugin provides a comprehensive implementation of the IETF SATP protocol for secure, atomic cross-chain asset transfers. This plugin enables standardized interoperability between different distributed ledger technologies.


**Target Audience:**

- [x] Developers
- [x] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-plugin-satp-hermes
```

## API Summary

The package exports `SATPGateway`, `SATPGatewayConfig`, the gateway factory,
generated API clients, protocol types, cross-chain bridge types, adapter APIs,
and gateway configuration-loading utilities. See
[`public-api.ts`][package-doc-src-main-typescript-public-api-ts] for the maintained export
surface and [the bundled OpenAPI document][package-doc-src-main-json-oapi-api1-bundled-json]
for application-to-gateway request and response schemas.

## Key Features

- **Atomic Asset Transfers**: Secure, atomic asset transfers between heterogeneous blockchain networks
- **Multi-Ledger Support**: Native support for Hyperledger Fabric, Ethereum/Besu, and extensible architecture for additional ledgers
- **Crash Recovery**: Comprehensive crash recovery mechanisms ensuring transaction consistency and fault tolerance
- **IETF SATP Compliance**: Implementation of the IETF SATP protocol specification
- **Gateway Architecture**: Implements the gateway paradigm as defined in [Hermes research paper](https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337)
- **Session Management**: Advanced session lifecycle management with persistent logging and state recovery
- **Security**: Cryptographic security with digital signatures, proof verification, and secure messaging

The plugin supports both bidirectional and unidirectional asset transfers with the following capabilities:
- Asset locking and proof generation on source ledger
- Secure proof transmission and verification
- Asset extinguishment on source ledger and regeneration on destination ledger
- Rollback mechanisms for failed transfers
- Comprehensive audit trails and accountability

## Table of Contents

- [Assumptions](#assumptions)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Protocol Flow](#protocol-flow)
- [Application-to-Gateway API (API Type 1)](#application-to-gateway-api-api-type-1)
- [Gateway-to-Gateway API (API Type 2)](#gateway-to-gateway-api-api-type-2)
- [Adapter Layer (API Type 3)](#adapter-layer-api-type-3)
- [Gateway Configuration](#gateway-configuration)
- [Containerization](#containerization)
- [Running local Gateway with Docker Compose](#running-local-gateway-with-docker-compose)
- [Contributing](#contributing)
- [Release Process](#release-process)
- [License](#license)

## Assumptions
Regarding the crash recovery procedure in place, at the moment we only support crashes of gateways under certain assumptions detailed as follows:
  - Gateways crash only after receiving a message (and before sending the next one)
  - Gateways crash only after logging to the Log Storage the previously received message
  - Gateways never lose their long term keys
  - Gateways do not have Byzantine behavior
  - Gateways are assumed to always recover from a crash

We will be working on reducing these assumptions and making the system more resilient to faults.

## Usage

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

### Core Components

The SATP Hermes implementation consists of several key components working together to enable secure cross-chain transfers:

#### Gateway Layer
- **Source Gateway**: Manages the asset transfer initiation, asset locking, and proof generation
- **Destination Gateway**: Handles transfer validation, asset creation, and completion confirmation
- **Protocol Handlers**: Implement SATP protocol stages (0-3) with comprehensive message handling
- **Session Management**: Maintains transfer state, handles timeouts, and manages recovery procedures

#### Ledger Integration Layer
- **Fabric Connector**: Native Hyperledger Fabric integration with chaincode invocation and event handling
- **Besu Connector**: Ethereum/Besu integration with smart contract deployment and interaction
- **Extensible Architecture**: Plugin-based design for adding support for additional ledger types

#### Persistence Layer
- **Local Database**: SQLite/PostgreSQL support for local session data and logging
- **Remote Logging**: Distributed logging with IPFS integration for accountability and auditability
- **Session Storage**: Persistent storage of transfer sessions, proofs, and cryptographic signatures

#### Security Layer
- **Cryptographic Operations**: Digital signatures, hash verification, and proof generation
- **Identity Management**: Gateway authentication and authorization
- **Secure Messaging**: End-to-end encrypted communication between gateways

### Protocol Flow

The SATP protocol operates in four distinct stages:

1. **Stage 0 (Initialization)**: Session establishment and capability negotiation
2. **Stage 1 (Transfer Agreement)**: Asset details negotiation and transfer commitment
3. **Stage 2 (Lock Evidence)**: Asset locking and proof generation/verification
4. **Stage 3 (Commitment)**: Final asset transfer completion and confirmation

The SATP protocol follows a standardized sequence of cross-chain asset transfer operations as defined in the IETF SATP v2 specification.

### Asset Identifier Fields: `token_id` vs `unique_descriptor`

The `Asset` message in the SATP protobuf schema exposes two distinct identifiers that serve different purposes. `token_id` is a **SATP-internal wrapper key** generated by the gateway during Stage 0 (Initialization) and is rewritten as the session progresses; it identifies the asset within the SATP session but has no meaning on either the source or destination chain. `unique_descriptor`, by contrast, is the **chain-native token type ID** — for ERC-1155 and ERC-6909 contracts this is the uint256 token type identifier that exists on-chain. It is carried as a string to preserve the full 256-bit precision without integer overflow. When implementing adapters or inspecting session state, use `token_id` to correlate SATP messages and use `unique_descriptor` to interact with the underlying smart contract.

### Crash Recovery Integration
The crash recovery protocol ensures session consistency across all stages of SATP. Each session's state, logs, hashes, timestamps, and signatures are stored and recovered using the following mechanisms:

1. **Session Logs**: A persistent log storage mechanism ensures crash-resilient state recovery.
2. **Consistency Checks**: Ensures all messages and actions are consistent across both gateways and the connected ledgers.
3. **Stage Recovery**: Recovers interrupted sessions by validating logs, hashes, timestamps, and signatures to maintain protocol integrity.
4. **Rollback Operations**: In the event of a timeout or irrecoverable failure, rollback messages ensure the state reverts back the current stage.
5. **Logging & Proofs**: The database is leveraged for state consistency and proof accountability across gateways.

Refer to the [Crash Recovery Sequence](https://datatracker.ietf.org/doc/html/draft-belchior-satp-gateway-recovery) for more details.

### Application-to-Gateway API (API Type 1)
The gateway exposes a REST API with the following endpoints:

#### API Endpoints
- **Transact**
  - Triggers a SATP transaction.

- **GetStatus**
  - Reads status information of a specific SATP session.

- **GetAllSessions**
  - Retrieves all session IDs known by the bridge.


### Gateway-to-Gateway API (API Type 2)
Gateway-to-gateway communication uses gRPC.

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

There are also defined the endpoints for the crash recovery procedure (the endpoint to receive the Rollback message is still pending):
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
  
## Gateway Configuration

Use the tracked gateway JSON examples and the `SATPGatewayConfig` interface as
the configuration sources of truth. The standalone CLI loads
`config/config.json` and optionally `config/adapter-config.yml` from its
working directory.

- [Gateway configuration][package-doc-docs-configuration-md]
- [Database and migrations][package-doc-docs-database-md]
- [Operator deployment and health checks][package-doc-docs-operations-md]

## Adapter Layer (API Type 3)

The adapter layer connects SATP protocol execution points to outbound webhooks
and optional inbound approval workflows. Its configuration schema, ordering,
timeouts, decision endpoint, and execution points are maintained in the
[API Type 3 adapter specification][package-doc-docs-api3-adapter-spec-md].

## Containerization

### Building the container image locally

In the project root directory run these commands on the terminal:

```sh
yarn configure
yarn lerna run build:bundle --scope=@hyperledger-cacti/cactus-plugin-satp-hermes
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
  -f ./packages/cactus-plugin-satp-hermes/docker-compose-satp.yml \
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
```sh
# Navigate to the directory containing the docker-compose file
cd packages/cactus-plugin-satp-hermes/

# Build and start containers (interactive mode)
docker-compose -f docker-compose-satp.yml up

# Build and start containers in background (detached mode)
docker-compose -f docker-compose-satp.yml up -d

# Stop and remove containers
docker-compose -f docker-compose-satp.yml down

# View container logs
docker-compose -f docker-compose-satp.yml logs

# Build or rebuild services
docker-compose -f docker-compose-satp.yml build

# List running containers
docker-compose -f docker-compose-satp.yml ps
```

## Testing

From the repository root, run the focused suites through the package workspace:

```sh
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes test:unit
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes test:integration:adapter
```

The package also defines focused gateway, bridge, oracle, recovery, rollback, and
container integration suites. These require the corresponding external ledger
or container dependencies.

## Contributing
We welcome contributions to Hyperledger Cacti in many forms, and there’s always interesting challenges!

Please review [CONTRIBUTING.md](https://github.com/hyperledger-cacti/cacti/blob/main/CONTRIBUTING.md "CONTRIBUTING.md") to get started.

## Release Process

See [docs/satp-release-process.md][package-doc-docs-satp-release-process-md] for the full release process, including the dev and production build types and the release checklist.


## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.

[package-doc-src-main-typescript-public-api-ts]: ./src/main/typescript/public-api.ts
[package-doc-src-main-json-oapi-api1-bundled-json]: ./src/main/json/oapi-api1-bundled.json
[package-doc-docs-configuration-md]: ./docs/configuration.md
[package-doc-docs-database-md]: ./docs/database.md
[package-doc-docs-operations-md]: ./docs/operations.md
[package-doc-docs-api3-adapter-spec-md]: ./docs/api3-adapter-spec.md
[package-doc-docs-satp-release-process-md]: docs/satp-release-process.md
