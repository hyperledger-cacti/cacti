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

- [`@hyperledger-cacti/cactus-plugin-satp-hermes`](#hyperledger-cacticactus-plugin-satp-hermes)
  - [Overview](#overview)
  - [Install](#install)
  - [API Summary](#api-summary)
  - [Key Features](#key-features)
  - [Table of Contents](#table-of-contents)
  - [Assumptions](#assumptions)
  - [Usage](#usage)
    - [Prerequisites](#prerequisites)
  - [Architecture](#architecture)
    - [Core Components](#core-components)
      - [Gateway Layer](#gateway-layer)
      - [Ledger Integration Layer](#ledger-integration-layer)
      - [Persistence Layer](#persistence-layer)
      - [Security Layer](#security-layer)
    - [Protocol Flow](#protocol-flow)
    - [Asset Identifier Fields: `token_id` vs `unique_descriptor`](#asset-identifier-fields-token_id-vs-unique_descriptor)
    - [Crash Recovery Integration](#crash-recovery-integration)
    - [Application-to-Gateway API (API Type 1)](#application-to-gateway-api-api-type-1)
      - [API Endpoints](#api-endpoints)
    - [Gateway-to-Gateway API (API Type 2)](#gateway-to-gateway-api-api-type-2)
      - [Connection Persistence](#connection-persistence)
  - [Use case](#use-case)
    - [Role of Crash Recovery in SATP](#role-of-crash-recovery-in-satp)
    - [Future Work](#future-work)
  - [Gateway Configuration](#gateway-configuration)
  - [Adapter Layer (API Type 3)](#adapter-layer-api-type-3)
  - [Containerization](#containerization)
    - [Building the container image locally](#building-the-container-image-locally)
    - [Build the image:](#build-the-image)
  - [Running local Gateway with Docker Compose](#running-local-gateway-with-docker-compose)
  - [Testing](#testing)
    - [Running the docker tests locally](#running-the-docker-tests-locally)
    - [Continuous Integration](#continuous-integration)
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

The SATP protocol follows a standardized sequence of cross-chain asset transfer operations as defined in the [IETF SATP v13 specification](https://datatracker.ietf.org/doc/html/draft-ietf-satp-core-13).

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

#### Connection Persistence

The connection model between gateways is **persistent per counterparty, not
per transfer**: the orchestrator creates one `GatewayChannel` per remote
gateway and reuses it for every transfer (session) with that gateway. Each
channel's five stage transports (stage 0–3 + crash recovery) target the same
`host:port` and share a pooled keep-alive HTTP agent with TCP probes.

Because SATP stage gaps — waiting for lock evidence, block confirmations and
signatures — routinely exceed Node's default 5-second idle timeout (a single
blockchain transaction leg is assumed to take up to ~2 minutes), both ends
are configured so a pooled connection survives a full asset transfer:

- **Server**: the gateway (GOL) HTTP(S) server keeps idle keep-alive
  connections open for `DEFAULT_KEEP_ALIVE_TIMEOUT_MS` (5 minutes) instead of
  Node's 5-second default, with `headersTimeout` raised accordingly.
- **Client**: every counterparty channel pools its transports on a dedicated
  keep-alive agent (`keepAliveMsecs` = 15s TCP probes) so intermediate
  NATs/proxies do not drop the sockets during long stage gaps.

This matters most when measuring transport cost: without it, every stage
message pays a fresh TCP + TLS handshake, which attributes the (expensive,
especially with PQC/ML-DSA certificates) handshake cost to every transfer
instead of amortizing it across the gateway relationship. Future work for
even stronger persistence: TLS 1.3 session-resumption tickets (skip the full
handshake even after a dropped connection) and HTTP/2 transports (a single
multiplexed connection per counterparty).

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

The tracked Compose service mounts the Gateway 1 development configuration at the path expected by the container. That configuration connects to an Ethereum JSON-RPC endpoint at `http://host.docker.internal:8545`, so start the corresponding local development ledger before starting the gateway. Replace the example credentials and endpoint configuration outside local development.

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

The package also defines focused gateway, bridge, oracle, recovery, rollback,
and container integration suites. These require the corresponding external
ledger or container dependencies.

### Running the docker tests locally

The Docker suites run real SATP scenarios against gateways executing in
containers. They are split in two:

| Suite | Script | Image under test | Validates |
|-------|--------|------------------|-----------|
| `docker-upstream` | `test:integration:docker-upstream` | Pre-published upstream image (`SATP_DOCKER_IMAGE_NAME`/`SATP_DOCKER_IMAGE_VERSION` in `src/test/typescript/constants.ts`) | The published gateway image boots and serves its OAPI healthcheck |
| `docker-local` | `test:integration:docker-local` | Image built from the current branch, tagged `hyperledger/cacti-satp-hermes-gateway:local-dev` | Oracle executions and end-to-end SATP transfers (Besu/Ethereum, single- and dual-gateway) against your branch code |

Prerequisites (from the repository root):

```sh
# 1. Node 20 and dependencies, built once
nvm use 20.20.0
yarn configure

# 2. Docker Desktop / Engine running (docker info should succeed)

# 3. Build the gateway image from the current branch (docker-local only)
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes docker:build:local
```

`docker:build:local` runs the webpack bundle for the gateway CLI and then
builds `satp-hermes-gateway.Dockerfile` with the tag `local-dev`.

Run the suites:

```sh
# Full scenarios: spins up Besu and Go-Ethereum test ledgers, PostgreSQL
# (postgres:17.2) containers, and the gateway container(s)
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes test:integration:docker-local

# Fast smoke test: boots one gateway container and polls its healthcheck
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes test:integration:docker-upstream
```

Both suites run serially (`--runInBand`) with a one-hour per-test timeout, so
budget time accordingly; `docker-local` additionally spends several minutes
building the image the first time.

To run a single test file, invoke Jest from the package directory:

```sh
cd packages/cactus-plugin-satp-hermes
NODE_OPTIONS=--max-old-space-size=4096 npx jest \
  src/test/typescript/integration/docker-local/satp-e2e-transfer-dockerization.test.ts \
  --runInBand --forceExit --config=jest.config-integration-docker-local.ts
```

What gets created on your machine:

- Gateway containers publish host ports `3010` (gRPC server), `3011` (gRPC
  client), and `4010` (OpenAPI/healthcheck).
- JUnit reports:
  `reports/junit/satp-hermes-tests-integration-docker-{local,upstream}.xml`
  (relative to the package directory).
- Gateway `config.json` and log files mounted into the containers:
  `cache/` (relative to the package directory, git-ignored).

Common failure modes:

- **Port already in use on 3010/3011/4010** — the gateway containers bind
  those ports on the host; stop the conflicting process or container first.
  Ledger and database containers use auto-assigned host ports, so they rarely
  conflict.
- **`docker-local` fails with "no such image"** — run `docker:build:local`
  first; the tag must stay `hyperledger/cacti-satp-hermes-gateway:local-dev`
  to match `SATP_LOCAL_DOCKER_IMAGE_NAME`/`SATP_LOCAL_DOCKER_IMAGE_VERSION`
  in `src/test/typescript/constants.ts`.
- **`docker-upstream` image pull fails** — the suite pulls
  `ghcr.io/hyperledger-cacti/cacti-satp-hermes-gateway:3.0.1`; the tag is
  pinned in `src/test/typescript/constants.ts` and in
  `.github/workflows/satp-hermes-workflow.yaml`, so keep them in sync when
  bumping the image.
- **First build is slow** — `docker:build:local` bundles the gateway CLI and
  installs OS packages inside the image; later runs reuse Docker's layer
  cache and are much faster.
- **Leftovers from an interrupted run** — check `docker ps` and remove
  orphaned gateway/ledger containers before re-running.
- **Out-of-memory kills** — the gateway image pins
  `NODE_OPTIONS=--max-old-space-size=4096`; give the Docker engine enough
  memory for several Node processes plus two ledgers at once (8 GB+
  recommended).

### Continuous Integration

CI (`.github/workflows/satp-hermes-workflow.yaml`, invoked from `ci.yaml`
whenever this package is affected) runs both Docker suites automatically as
`continue-on-error` jobs:

- `run-satp-tests-integration-docker-upstream` (60-minute job cap): pulls the
  pinned upstream gateway image and runs the `docker-upstream` test pattern.
- `run-satp-tests-integration-docker-local` (90-minute job cap): builds the
  gateway image from the branch source with Docker Buildx (GHA layer cache),
  tags it `hyperledger/cacti-satp-hermes-gateway:local-dev`, and runs the
  `docker-local` test pattern.

Each job publishes a JUnit-based check report
(`satp-gateway-docker-upstream-tests-report` /
`satp-gateway-docker-local-tests-report`) and, when code coverage is enabled,
a `coverage-reports-satp-hermes-gateway-docker-{upstream,local}` artifact.

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
