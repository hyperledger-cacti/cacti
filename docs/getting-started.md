# Getting Started with SATP (Secure Asset Transfer Protocol)

## Table of Contents
- [Getting Started with SATP (Secure Asset Transfer Protocol)](#getting-started-with-satp-secure-asset-transfer-protocol)
  - [Table of Contents](#table-of-contents)
  - [Setting Up Your Gateway](#setting-up-your-gateway)
    - [Gateway Configuration](#gateway-configuration)
    - [Bridge Configuration](#bridge-configuration)
      - [For Fabric Networks:](#for-fabric-networks)
      - [For Besu Networks:](#for-besu-networks)
  - [Running Your Gateway](#running-your-gateway)
    - [Using Docker](#using-docker)
      - [Option 1: Using Pre-built Image](#option-1-using-pre-built-image)
      - [Option 2: Building the Image Locally](#option-2-building-the-image-locally)
    - [Using Docker Compose](#using-docker-compose)
  - [Interacting with Your Gateway](#interacting-with-your-gateway)
    - [API Usage](#api-usage)
      - [Check Gateway Health](#check-gateway-health)
      - [Initiate a Transfer](#initiate-a-transfer)
      - [Check Transfer Status](#check-transfer-status)
      - [Cancel a Transfer](#cancel-a-transfer)
      - [Pause and Continue Transfers](#pause-and-continue-transfers)
      - [Get Available Routes](#get-available-routes)
      - [Get Supported Integrations](#get-supported-integrations)
      - [Audit Transactions](#audit-transactions)
    - [Monitoring Transfers](#monitoring-transfers)
  - [Troubleshooting](#troubleshooting)

## Setting Up Your Gateway

### Gateway Configuration

Create a configuration file `gateway-config.json` for your SATP gateway:

```json
{
  "gid": {
    "id": "your-gateway-id",
    "name": "YourGatewayName",
    "version": [
      {
        "Core": "v02",
        "Architecture": "v02",
        "Crash": "v02"
      }
    ],
    "proofID": "your-proof-id",
    "address": "http://your-gateway-address",
    "gatewayServerPort": 3010,
    "gatewayClientPort": 3011,
    "gatewayOpenAPIPort": 4010,
    "connectedDLTs": ["BesuNetwork1", "FabricNetwork1"]
  },
  "logLevel": "INFO",
  "environment": "development",
  "enableCrashRecovery": true,
  "localRepository": {
    "client": "sqlite3",
    "connection": {
      "filename": "./gateway-db.sqlite"
    },
    "useNullAsDefault": true
  }
}
```

### Bridge Configuration

You'll need to configure each blockchain network you want to connect. Create a `bridge-config.json` file:

#### For Fabric Networks:
```json
{
  "networkIdentification": {
    "id": "FabricNetwork1",
    "ledgerType": "FABRIC_2"
  },
  "userIdentity": {
    "credentials": {
      "certificate": "YOUR_CERTIFICATE",
      "privateKey": "YOUR_PRIVATE_KEY"
    },
    "mspId": "YourMSPID",
    "type": "X.509"
  },
  "channelName": "yourchannel",
  "targetOrganizations": [
    {
      "CORE_PEER_TLS_ENABLED": "true",
      "CORE_PEER_LOCALMSPID": "Org1MSP",
      "CORE_PEER_TLS_CERT_FILE": "/path/to/cert.crt",
      "ORDERER_TLS_ROOTCERT_FILE": "/path/to/ca.crt"
    }
  ],
  "orderer": "orderer.example.com:7050",
  "connTimeout": 60
}
```

#### For Besu Networks:
```json
{
  "networkIdentification": {
    "id": "BesuNetwork1",
    "ledgerType": "BESU_2X"
  },
  "signingCredential": {
    "ethAccount": "0xYourEthereumAddress",
    "secret": "0xYourPrivateKey",
    "type": "PRIVATE_KEY_HEX"
  },
  "connectorOptions": {
    "rpcApiHttpHost": "http://your-besu-node:8545",
    "rpcApiWsHost": "ws://your-besu-node:8546"
  },
  "wrapperContractName": "YourContractName"
}
```

## Running Your Gateway

### Using Docker

The simplest way to run your gateway is using our pre-built Docker image.

#### Option 1: Using Pre-built Image

1. Create your configuration directory:
```bash
mkdir -p config database
cp gateway-config.json config/
cp bridge-config.json config/
```

2. Pull and run the image:
```bash
docker pull rafaelapb/satp-hermes-gateway:latest

docker run -it \
  -p 3010:3010 \
  -p 3011:3011 \
  -p 4010:4010 \
  -v $(pwd)/config:/opt/cacti/satp-hermes/config \
  -v $(pwd)/database:/opt/cacti/satp-hermes/database \
  rafaelapb/satp-hermes-gateway:latest
```

The gateway exposes these ports:
- 4010: API Port (for your applications to interact with)
- 3010: Internal communication port
- 3011: Management port

#### Option 2: Building the Image Locally

If you need to customize the gateway:

1. Build the image:
```bash
# For stable builds
yarn docker:build:stable

# For development builds
yarn docker:build:dev
```

2. Run your custom build:
```bash
docker run -it \
  -p 3010:3010 \
  -p 3011:3011 \
  -p 4010:4010 \
  -v $(pwd)/config:/opt/cacti/satp-hermes/config \
  -v $(pwd)/database:/opt/cacti/satp-hermes/database \
  satp-hermes-gateway
```

### Using Docker Compose

For more complex setups, use Docker Compose:

1. Create a `docker-compose.yml`:
```yaml
version: '3.8'
services:
  satp-gateway:
    image: rafaelapb/satp-hermes-gateway:latest
    ports:
      - "4010:4010"
      - "3010:3010"
      - "3011:3011"
    volumes:
      - ./config:/opt/cacti/satp-hermes/config
      - ./database:/opt/cacti/satp-hermes/database
    environment:
      - NODE_ENV=development
```

2. Start the services:
```bash
# Interactive mode
docker-compose up

# Detached mode
docker-compose up -d
```

3. Stop the services:
```bash
docker-compose down
```

## Interacting with Your Gateway

### API Usage

The SATP Gateway provides a comprehensive REST API (API1) for managing asset transfers. All endpoints are available at `http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/`.

#### Check Gateway Health
```bash
curl -X GET http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck
```

#### Initiate a Transfer
```bash
curl -X POST http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/transact \
  -H "Content-Type: application/json" \
  -d '{
    "sourceGatewayId": "gateway1",
    "recipientGatewayId": "gateway2",
    "tokenId": "token123",
    "amount": "100",
    "tokenType": "ERC20",
    "sourceNetwork": {
      "id": "BesuNetwork1",
      "type": "BESU_2X"
    },
    "recipientNetwork": {
      "id": "FabricNetwork1",
      "type": "FABRIC_2"
    }
  }'
```

#### Check Transfer Status
```bash
curl -X GET "http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/status?SessionID=your-session-id"
```

#### Cancel a Transfer
```bash
curl -X POST http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "your-session-id"
  }'
```

#### Pause and Continue Transfers
```bash
# Pause a transfer
curl -X POST http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/pause \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "your-session-id"
  }'

# Continue a paused transfer
curl -X POST http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/continue \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "your-session-id"
  }'
```

#### Get Available Routes
```bash
curl -X GET "http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/routes?fromNetworkID=BesuNetwork1&fromAmount=100&fromToken=0x123...&toDLTNetwork=FabricNetwork1&toToken=token123&fromAddress=0x456...&toAddress=0x789..."
```

#### Get Supported Integrations
```bash
curl -X GET http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations
```

#### Audit Transactions
```bash
# Get all transactions
curl -X GET "http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/audit"

# Get transactions within a date range
curl -X GET "http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/audit?auditStartDate=2024-01-01T00:00:00Z&auditEndDate=2024-12-31T23:59:59Z&includeProofs=true"
```

### Monitoring Transfers

1. View all active transfers:
```bash
curl -X GET http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids
```

2. Check specific transfer details:
```bash
curl -X GET "http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/status?SessionID=your-session-id"
```

3. View transfer logs:
```bash
docker logs satp-hermes-gateway
```

## Troubleshooting

Common issues and solutions:

1. **Gateway Won't Start**
   - Check if ports 3010, 3011, and 4010 are available
   - Verify your configuration files are correctly mounted
   - Check Docker logs: `docker logs satp-hermes-gateway`

2. **Transfer Fails**
   - Verify network connectivity to both blockchains
   - Check account balances and permissions
   - Ensure smart contracts are properly deployed
   - Review logs in `database/gateway-db.sqlite`

3. **Configuration Issues**
   - Validate JSON syntax in config files
   - Ensure all required fields are present
   - Check network endpoints are accessible
   - Verify credentials and certificates

4. **Performance Issues**
   - Monitor resource usage: `docker stats satp-hermes-gateway`
   - Check network latency to blockchain nodes
   - Consider increasing timeout values in configuration

For additional help:
- Check the logs: `docker logs satp-hermes-gateway`
- Review the database: `sqlite3 database/gateway-db.sqlite`
- Join our [Discord community](https://discord.gg/hyperledger)
- File issues on [GitHub](https://github.com/hyperledger/cacti/issues) 