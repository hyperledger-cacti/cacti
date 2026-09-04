# `@hyperledger-cacti/cactus-test-tooling`

> Swiss army knife for test development. Main goal is to make pulling up test/dummy ledgers on the fly for tests easy, especially for test cases that are about simulating clean ledger state or wiped ledger state, etc.

## Overview
Test infrastructure harness for spinning up ephemeral DLT nodes and support services in Docker during test execution. 

**Target Audience:**
- [x] Developers
- [ ] Operators

## Prerequisites
- Node.js >= 18
- Docker daemon must be running

## Install
```bash
npm install --save-dev @hyperledger-cacti/cactus-test-tooling
```

## API Summary

### Supported Test Ledgers

| Ledger Class | DLT / Network |
|---|---|
| `BesuTestLedger` | Besu |
| `BesuMpTestLedger` | Besu |
| `CordaTestLedger` | Corda |
| `CordaV5TestLedger` | Corda |
| `DamlTestLedger` | Daml |
| `FabricTestLedgerV1` | Fabric |
| `IndyTestLedger` | Indy |
| `OpenEthereumTestLedger` | OpenEthereum |
| `StellarTestLedger` | Stellar |
| `SubstrateTestLedger` | Substrate |

### Auxiliary Containers

| Class | Description |
|---|---|
| `CordaConnectorContainer` | Container for Corda Connector |
| `GoIpfsTestContainer` | IPFS Test Container |
| `HttpEchoContainer` | HTTP Echo Server Container |
| `KeycloakContainer` | Keycloak Server Container |
| `LocalStackContainer` | LocalStack Container |
| `PostgresTestContainer` | PostgreSQL Database Container |
| `SATPGatewayRunner` | SATP Gateway Runner |
| `VaultTestServer` | HashiCorp Vault Test Server |
| `WsTestServer` | WS Identity Test Server |

### Utilities
- `Containers`: Helpers for Docker pruning and management.
- `SelfSignedPkiGenerator`: Generates self-signed PKI for testing.
- GitHub Actions helpers (`isRunningInGithubAction`, `pruneDockerAllIfGithubAction`, `pruneDockerContainersIfGithubAction`)

## Usage

Here is a generic lifecycle pattern for spinning up a test ledger:

```typescript
import { BesuTestLedger } from "@hyperledger-cacti/cactus-test-tooling";

const ledger = new BesuTestLedger();
await ledger.start();

const networkConfig = await ledger.getNetworkConfiguration();

// ... run tests using the network configuration ...

await ledger.stop();
await ledger.destroy();
```

### Stellar Test Ledger Usage

The Stellar test ledger follows the same structure present in the test ledger tools for other networks within the Cacti project. It pulls up and manages the [Stellar Quickstart Docker Image](https://github.com/stellar/quickstart) and can be used by importing the class `StellarTestLedger`, then instantiating it with some key optional arguments to define how the image should be configured.

- `network`: Defines if the image should pull up a pristine local ledger or alternatively connect to an existing public test ledger. Defaults to `local`. It is important to note that connecting to an existing network can take up to several minutes to synchronize the ledger state.
- `limits`: Defines the resource limits for soroban smart contract transactions. A valid transaction can only be included in a ledger block if enough resources are available for that operation. Defaults to `testnet`, which mimics the actual resource limits applied to the mainnet based on its test environment.

Once the class is successfully instantiated, one can start the environment by triggering:

```typescript
await stellarTestLedger.start();
```

The image will be pulled up and wait until the healthcheck ensures all of its services have started successfully and are accessible, then returns the container object.

When integrating to a Stellar environment, it is common to use a few key services provided at different ports and paths. Once the class has been started, one can use the method `getNetworkConfiguration()` to get an object containing the required information to connect to these services.

This object is already formatted to be used with the [stellar-plus](https://github.com/CheesecakeLabs/stellar-plus) open source js library to create a custom network configuration object that integrates with its provided tools, ensuring a frictionless development flow for this test ledger.

Once the image has been fully utilized, one can fully stop and remove the environment by triggering:

```typescript
await stellarTestLedger.stop();
await stellarTestLedger.destroy();
```

### WS-identity Server Image

`WsTestServer` manages a WS-identity server used to test the Fabric connector's
WS-X.509 credentials. Its default image is `ghcr.io/brioux/ws-identity:0.0.1`.
This image is for testing, not production.

To build an image locally, clone [ws-identity](https://github.com/brioux/ws-identity)
and run these commands from that repository:

```sh
npm install
npm run build
docker build . -t ws-identity-local
```

The `imageName` and `imageVersion` options select the image used by
[`WsTestServer`][package-doc-src-main-typescript-ws-test-server-ws-test-server-ts].

## Testing

To run tests for this package, use the `jest` command:

```bash
npx jest
```

[package-doc-src-main-typescript-ws-test-server-ws-test-server-ts]: ./src/main/typescript/ws-test-server/ws-test-server.ts
