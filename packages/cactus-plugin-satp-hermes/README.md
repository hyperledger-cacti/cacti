# @hyperledger/cactus-plugin-satp-hermes

The Hyperledger Cacti SATP (Secure Asset Transfer Protocol) Hermes plugin provides a comprehensive implementation of the IETF SATP protocol for secure, atomic cross-chain asset transfers. This plugin enables standardized interoperability between different distributed ledger technologies.

## Key Features

- **Atomic Asset Transfers**: Secure, atomic asset transfers between heterogeneous blockchain networks
- **Multi-Ledger Support**: Native support for Hyperledger Fabric, Ethereum/Besu, and extensible architecture for additional ledgers
- **Crash Recovery**: Comprehensive crash recovery mechanisms ensuring transaction consistency and fault tolerance
- **IETF SATP Compliance**: Full implementation of the IETF SATP protocol specification
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
  
## Gateway Configuration

The SATP Hermes plugin provides flexible configuration options to support various deployment scenarios. Configuration can be provided programmatically through TypeScript interfaces or loaded from JSON configuration files.

### Configuration Architecture

The gateway configuration follows a modular structure with the following main sections:

1. **Gateway Core Configuration** - Basic gateway settings and identity
2. **Database Configuration** - Local session storage and remote audit logging
3. **Ledger Connections** - Blockchain-specific connection parameters
4. **Security Configuration** - TLS, encryption, and authentication settings
5. **Monitoring Configuration** - Metrics, health checks, and alerting
6. **Performance Configuration** - Optimization and scaling parameters

### Configuration Templates

The plugin includes pre-built configuration templates for common deployment scenarios:

| Template | Use Case | Description |
|----------|----------|-------------|
| **Development** | Local testing | Minimal security, in-memory databases, debug logging |
| **Fabric-to-Besu** | Enterprise bridging | Production fabric to consortium Besu transfers |
| **Besu-to-Ethereum** | DeFi bridging | Testnet to mainnet asset transfers |
| **Multi-Ledger** | Complex interop | 3+ blockchain networks with advanced features |
| **Production** | Enterprise deployment | Maximum security, compliance, and monitoring |

### Core Gateway Interface

```typescript
export interface IPluginSatpGatewayConstructorOptions {
  name: string;                           // Plugin instance name
  dltIDs: string[];                      // Supported DLT identifiers
  instanceId: string;                    // Unique instance identifier
  keyPair?: IKeyPair;                    // Cryptographic key pair for signing
  backupGatewaysAllowed?: string[];      // List of allowed backup gateways
  clientHelper: ClientGatewayHelper;     // Client-side protocol helper
  serverHelper: ServerGatewayHelper;     // Server-side protocol helper
  knexLocalConfig?: Knex.Config;        // Local database configuration
  knexRemoteConfig?: Knex.Config;       // Remote logging database config
  ipfsPath?: string;                     // IPFS endpoint for distributed logging
}
```

### Configuration Examples

#### Reusing Deployed Wrapper Contracts

When you already have bridge wrapper contracts on-chain, provide their identifiers in the leaf configuration so the deployment step skips redeployment. The CLI entrypoint loads the configuration, `validateCCConfig` verifies the schema, and the bridge manager attaches each leaf to the supplied contract details.

##### Fabric Leaf Wrapper Example
```typescript
const fabricWrapperConfig = {
  networkIdentification: {
    id: "FabricLedgerTestNetwork",
    ledgerType: "FABRIC_2",
  },
  channelName: "mychannel",
  signingCredential: {/* Fabric signing credential */},
  connectorOptions: {/* Fabric connector options */},
  wrapperContractName: "satp-wrapper-fabric", // Existing chaincode package name
  claimFormats: [1],
};
```

##### Besu Leaf Wrapper Example
```typescript
const besuWrapperConfig = {
  networkIdentification: {
    id: "BesuLedgerTestNetwork",
    ledgerType: "BESU_2X",
  },
  signingCredential: {/* Besu signing credential */},
  connectorOptions: {/* Besu connector options */},
  wrapperContractName: "BesuWrapper",
  wrapperContractAddress: "0x1234...cdef",
  claimFormats: [1],
};
```

##### Ethereum Leaf Wrapper Example
```typescript
const ethereumWrapperConfig = {
  networkIdentification: {
    id: "EthereumLedgerTestNetwork",
    ledgerType: "ETHEREUM",
  },
  signingCredential: {/* Ethereum signing credential */},
  connectorOptions: {/* Ethereum connector options */},
  wrapperContractName: "EthereumWrapper",
  wrapperContractAddress: "0x9876...abcd",
  claimFormats: [1],
};
```

If both `wrapperContractName` and `wrapperContractAddress` are present (Fabric only requires the name), leaf deployment logs that contracts already exist and continues without redeploying them.

#### Fabric Configuration Example:
Comprehensive configuration examples are available in the `src/examples/config/` directory:

#### Quick Start - Development Configuration

```typescript
import { developmentGatewayConfig } from './src/examples/config/gateway-configs';

const gateway = new FabricSatpGateway({
  name: "dev-gateway",
  dltIDs: ["local-fabric", "local-besu"],
  instanceId: "dev-001",
  keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
  clientHelper: new ClientGatewayHelper(),
  serverHelper: new ServerGatewayHelper(),
  knexLocalConfig: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  }
});
```

#### Production Configuration from JSON

```typescript
import * as fs from 'fs';

// Load configuration from JSON file
const config = JSON.parse(
  fs.readFileSync('./src/examples/config/production-gateway.json', 'utf8')
);

// Environment variable substitution
const processedConfig = processEnvironmentVariables(config);

// Create gateway instance
const gateway = new FabricSatpGateway(processedConfig);
```

### Configuration Validation

The plugin provides built-in configuration validation:

```typescript
import { validateConfiguration } from './src/examples/config/gateway-configs';

try {
  validateConfiguration(config);
  console.log('✓ Configuration is valid');
} catch (error) {
  console.error('✗ Configuration validation failed:', error.message);
}
```

### Environment-Specific Settings

#### Development Environment
- **Database**: In-memory SQLite for fast testing
- **Security**: Disabled TLS/authentication for simplicity
- **Logging**: Verbose debug logging enabled
- **Monitoring**: Basic health checks only

#### Production Environment
- **Database**: PostgreSQL with SSL and connection pooling
- **Security**: Full TLS/mTLS with certificate-based authentication
- **Logging**: Structured logging with audit trails
- **Monitoring**: Comprehensive metrics, alerting, and dashboards

#### Hyperledger Fabric Configuration

Fabric gateways require connection profiles, MSP configuration, and channel/chaincode details:

```json
{
  "fabric": {
    "type": "fabric",
    "networkId": "fabric-production",
    "connectorUrl": "https://fabric-connector.example.com:4000",
    "signingCredential": {
      "keychainId": "fabric-keychain",
      "keychainRef": "gateway-identity",
      "type": "VAULT_X509"
    },
    "channelName": "asset-transfer-channel",
    "contractName": "satp-asset-wrapper",
    "connectionProfile": {
      "name": "production-network",
      "organizations": { ... },
      "peers": { ... },
      "orderers": { ... }
    }
  }
}
```

#### Besu/Ethereum Configuration

Ethereum-compatible networks use Web3 signing credentials and contract addresses:

```json
{
  "besu": {
    "type": "besu",
    "networkId": "besu-mainnet",
    "connectorUrl": "https://besu-connector.example.com:4000",
    "web3SigningCredential": {
      "transactionSignerEthAccount": "${ETH_ACCOUNT}",
      "secret": "${ETH_PRIVATE_KEY}",
      "type": "PRIVATE_KEY_HEX"
    },
    "contractName": "SATPAssetWrapper",
    "contractAddress": "${CONTRACT_ADDRESS}",
    "rpcEndpoints": {
      "http": "https://mainnet.infura.io/v3/${PROJECT_ID}",
      "ws": "wss://mainnet.infura.io/ws/v3/${PROJECT_ID}"
    },
    "gasConfig": {
      "gasLimit": "3000000"
    }    
  }
}
```

### Security Configuration Choices

#### Certificate-Based Authentication (Recommended for Production)

```json
{
  "security": {
    "enableTLS": true,
    "certificatePath": "/certs/gateway.crt",
    "privateKeyPath": "/certs/gateway.key",
    "enableMTLS": true,
    "clientCACertPath": "/certs/client-ca.crt",
    "encryption": {
      "algorithm": "AES-256-GCM",
      "keyRotationInterval": "12h"
    }
  }
}
```

#### OAuth2 Integration

```json
{
  "api": {
    "authentication": {
      "enabled": true,
      "type": "oauth2",
      "oauthServerUrl": "https://oauth.example.com",
      "clientId": "${OAUTH_CLIENT_ID}",
      "clientSecret": "${OAUTH_CLIENT_SECRET}",
      "scope": ["satp:read", "satp:write"]
    }
  }
}
```

### Database Configuration Choices

#### SQLite (Development/Testing)
```json
{
  "database": {
    "local": {
      "client": "sqlite3",
      "connection": { "filename": ":memory:" },
      "useNullAsDefault": true
    }
  }
}
```

#### PostgreSQL (Production)
```json
{
  "database": {
    "local": {
      "client": "postgresql",
      "connection": {
        "host": "${DB_HOST}",
        "port": 5432,
        "user": "${DB_USER}",
        "password": "${DB_PASSWORD}",
        "database": "${DB_NAME}",
        "ssl": { "rejectUnauthorized": true }
      },
      "pool": { "min": 10, "max": 50 }
    }
  }
}
```

### Monitoring Configuration Choices

#### Basic Monitoring (Development)
```json
{
  "monitoring": {
    "enabled": true,
    "healthCheckPort": 8080,
    "prometheus": { "enabled": false }
  }
}
```

#### Advanced Monitoring (Production)
```json
{
  "monitoring": {
    "enabled": true,
    "metricsPort": 9090,
    "healthCheckPort": 8080,
    "prometheus": { "enabled": true, "endpoint": "/metrics" },
    "grafana": { "dashboardUrl": "https://grafana.example.com" },
    "alerting": {
      "enabled": true,
      "pagerduty": { "integrationKey": "${PAGERDUTY_KEY}" },
      "slack": { "webhookUrl": "${SLACK_WEBHOOK}" },
      "email": { "recipients": ["ops@example.com"] }
    }
  }
}
```

### Performance Configuration Choices

#### Standard Performance
```json
{
  "performance": {
    "sessionPoolSize": 100,
    "maxConcurrentTransfers": 50,
    "transferTimeout": "10m"
  }
}
```

#### High-Performance Configuration
```json
{
  "performance": {
    "sessionPoolSize": 500,
    "maxConcurrentTransfers": 200,
    "transferTimeout": "5m",
    "retryPolicy": {
      "maxRetries": 5,
      "backoffMultiplier": 1.5,
      "initialBackoffMs": 1000
    },
    "caching": {
      "enabled": true,
      "redis": {
        "host": "${REDIS_HOST}",
        "password": "${REDIS_PASSWORD}"
      }
    }
  }
}
```

### Configuration File Usage

All configuration examples are available as JSON files in `src/examples/config/`:

```bash
# Development setup
cp src/examples/config/development-gateway.json ./gateway-config.json

# Production setup with environment variables
cp src/examples/config/production-gateway.json ./gateway-config.json
# Set environment variables in .env or deployment system

# Multi-ledger setup
cp src/examples/config/multi-ledger-gateway.json ./gateway-config.json
```

For detailed configuration options and examples, see the [Configuration Examples Documentation](./src/examples/config/README.md).

### Legacy Configuration Examples

The following examples show the previous programmatic configuration approach:

#### Legacy Fabric Configuration Example:
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
    transactionSignerEthAccount: "0x736dC9B8258Ec5ab2419DDdffA9e1fa5C201D0b4", // ETH account (public key) of the owner of the bridge that signs transactions
    secret: "0xc31e76f70d6416337d3a7b7a8711a43e30a14963b5ba622fa6c9dbb5b4555986", // Private key in hex
    type: "PRIVATE_KEY_HEX"
  },
  gasConfig: {
    gasLimit: "6000000",  // Default gas limit for transactions
  },
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
    transactionSignerEthAccount: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B", // ETH account (public key) of the owner of the bridge that signs transactions
    secret: "test",                                // Key store password or secret
    type: "GETH_KEYCHAIN_PASSWORD"                 // Credential type for geth keychain
  },
  gasConfig: {
    gas: "6721975", // Default gas limit for transactions
    gasPrice: "20000000000" // Default gas Price
  },                                    
  connectorOptions: {
    rpcApiHttpHost: "http://172.20.0.7:8545",     // Ethereum JSON-RPC HTTP endpoint
    rpcApiWsHost: "ws://172.20.0.7:8546"          // Ethereum JSON-RPC WebSocket endpoint
  },
  wrapperContractName: "exampleWrapperContractName", // Used if we want to use a costum name, if not given it will be provided by the leaf
  wrapperContractAddress: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B", // Only used if the contract was already deployed
  claimFormats: [1]                               // Claim format identifiers (application-specific)
}
```

### Gateway Example (One Leaf Using Existing Wrapper)
```typescript
const gatewayConfig = {
  gid: {
    id: "gatewayId",
    name: "GatewayWithBesuConnection",
    identificationCredential: {
      signingAlgorithm: "SECP256K1",
      pubKey: "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
    },
    version: [{ Core: "v02", Architecture: "v02", Crash: "v02" }],
    proofID: "mockProofID10",
    address: "http://gateway1.satp-hermes",
  },
  logLevel: "TRACE",
  counterPartyGateways: [],
  localRepository: localDbKnexConfig,
  remoteRepository: remoteDbKnexConfig,
  environment: "development",
  ontologyPath: "/opt/cacti/satp-hermes/ontologies",
  enableCrashRecovery: true,
  ccConfig: {
    bridgeConfig: [
      {
        networkIdentification: {
          id: "BesuLedgerTestNetwork",
          ledgerType: "BESU_2X",
        },
        signingCredential: {
          transactionSignerEthAccount: "0x736dC9B8258Ec5ab2419DDdffA9e1fa5C201D0b4",
          secret: "0xc31e76f70d6416337d3a7b7a8711a43e30a14963b5ba622fa6c9dbb5b4555986",
          type: "PRIVATE_KEY_HEX",
        },
        gasConfig: {
          gasLimit: "6000000",
        },        
        connectorOptions: {
          rpcApiHttpHost: "http://172.20.0.6:8545",
          rpcApiWsHost: "ws://172.20.0.6:8546",
        },
        wrapperContractName: "BesuWrapper",
        wrapperContractAddress: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B",
        claimFormats: [1],
      },
    ],
  },
};
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

## Release process
TBD. For each release, a commit in the form: "chore(satp-hermes): version X release" will be made.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.
