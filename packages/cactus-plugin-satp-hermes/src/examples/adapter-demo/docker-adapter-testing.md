# SATP Hermes Gateway - Docker Adapter Layer Testing Guide

This document provides instructions for building and running the SATP Hermes Gateway Docker image with adapter layer configuration for testing purposes.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Multi-Gateway Bridge Deployment](#multi-gateway-bridge-deployment)
- [Configuration Files](#configuration-files)
- [Makefile Commands](#makefile-commands)
- [API Endpoints](#api-endpoints)
- [Adapter Configuration](#adapter-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The SATP Hermes Gateway supports an **Adapter Layer** that enables external systems to integrate with and control SATP transfers through webhook-based communication. This guide covers how to:

1. Build the Docker image
2. Run the gateway with adapter configuration
3. Deploy SATPWrapper contracts to Besu networks
4. Run a multi-gateway bridge setup for cross-chain testing
5. Test the adapter endpoints

## Prerequisites

- **Docker** (version 20.10+)
- **Git** (for cloning/checkout)
- **curl** and **jq** (for API testing)
- **Make** (for running makefile commands)
- **Foundry** (for contract deployment - optional)

### Install Dependencies (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y docker.io curl jq make

# Install Foundry for contract deployment (optional)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Verify Docker Setup

Before proceeding, verify Docker is properly configured:

```bash
# Check Docker is installed and running
docker --version
docker info | head -5

# Test Docker can run containers
docker run --rm hello-world
```

## Quick Start

### Complete Quickstart (Copy & Paste)

Run these commands from the repository root to get the SATP Hermes Gateway with adapters running:

```bash
# 1. Navigate to the SATP Hermes package
cd packages/cactus-plugin-satp-hermes

# 2. Set the makefile path
MAKEFILE=src/examples/docker-adapter-test.mk

# 3. Build the Docker image (from within the package directory)
docker build --pull --rm \
  -f satp-hermes-gateway.Dockerfile \
  -t satp-hermes-gateway-adapter-test:latest \
  .

# 4. Start the gateway (using Makefile)
make -f "$MAKEFILE" run

# 5. Verify gateway is running
make -f "$MAKEFILE" test

# 6. Stop the demo when finished
make -f "$MAKEFILE" stop
```

### Gateway Management (using Makefile)

```bash
# Stop the gateway
make -f "$MAKEFILE" stop

# Start the gateway again
make -f "$MAKEFILE" run

# View logs
make -f "$MAKEFILE" logs

# Run health check
make -f "$MAKEFILE" healthcheck

# Run all tests (health, integrations, sessions)
make -f "$MAKEFILE" test
```

### Option 1: Using the Makefile (Recommended)

```bash
# Navigate to the package directory
cd packages/cactus-plugin-satp-hermes

# Full setup: build image, and run container
make -f "$MAKEFILE" setup

# Or run individual steps:
make -f "$MAKEFILE" build     # Build the Docker image
make -f "$MAKEFILE" run       # Run the container
make -f "$MAKEFILE" test      # Run adapter tests
```

### Option 2: Manual Docker Commands

```bash
# Navigate to the package directory
cd packages/cactus-plugin-satp-hermes

# Build the image
docker build \
  --pull --rm \
  -f satp-hermes-gateway.Dockerfile \
  -t satp-hermes-gateway-adapter-test:latest \
  .

# Run the container with adapter configuration
docker run -d --rm \
  --name satp-test-adapter \
  -p 3010:3010 \
  -p 3011:3011 \
  -p 4010:4010 \
  -v "$(pwd)/src/examples/config/satp-gateway1-simple-deployed-adapter.config.json:/opt/cacti/satp-hermes/config/config.json:ro" \
  -v "$(pwd)/src/examples/config/adapter/satp-gateway1-simple-deployed-adapter.adapter-config.yml:/opt/cacti/satp-hermes/config/adapter-config.yml:ro" \
  satp-hermes-gateway-adapter-test:latest

# Verify the gateway is running
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq .
```

## Multi-Gateway Bridge Deployment

For testing cross-chain transfers, you can deploy a full bridge setup with two gateways.

### Full Bridge Deployment (One Command)

```bash
# Deploy contracts, generate configs, and run both gateways
make -f "$MAKEFILE" deploy-bridge
```

This will:
1. Deploy SATPWrapperContract to both Besu networks
2. Generate config files for both gateways in `/tmp`
3. Build the Docker image (if not already built)
4. Start both gateway containers

### Step-by-Step Bridge Deployment

```bash
# 1. Deploy SATPWrapper contracts to both Besu networks
make -f "$MAKEFILE" deploy-contracts

# 2. Generate config files for both gateways
make -f "$MAKEFILE" create-configs

# 3. Build the Docker image
make -f "$MAKEFILE" build

# 4. Run both gateways
make -f "$MAKEFILE" run-both
```

### Gateway Ports

| Gateway | API Port | Server Port | Client Port |
|---------|----------|-------------|-------------|
| Gateway 1 | 4010 | 3010 | 3011 |
| Gateway 2 | 4020 | 3020 | 3021 |

### Health Checks

```bash
# Check Gateway 1
make -f "$MAKEFILE" healthcheck-gw1

# Check Gateway 2
make -f "$MAKEFILE" healthcheck-gw2

# Or manually:
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq .
curl -s http://localhost:4020/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq .
```

### Gateway Logs

```bash
# View Gateway 1 logs
make -f "$MAKEFILE" logs-gw1

# View Gateway 2 logs
make -f "$MAKEFILE" logs-gw2
```

### Stop Gateways

```bash
# Stop both gateways
make -f "$MAKEFILE" stop-all

# Or individually:
make -f "$MAKEFILE" stop-gateway1
make -f "$MAKEFILE" stop-gateway2
```

## Configuration Files

### Configuration Sources

There are two ways to configure gateways:

1. **Static Config Files** (in `src/examples/config/`): Pre-made configurations for quick testing
2. **Generated Config Files** (in `tmp/`): Dynamically created by the makefile for multi-gateway setups

### Gateway Configuration (Static)

**Location:** `src/examples/config/satp-gateway1-simple-deployed-adapter.config.json`

This JSON file configures the gateway with:
- Gateway identity (ID, name, public key)
- Connected DLTs (Besu in this example)
- Counter-party gateways
- Bridge configuration with pre-deployed wrapper contract
- **Adapter configuration path** pointing to the YAML file

Key configuration:
```json
{
  "gid": {
    "id": "mockID-besu-adapter",
    "name": "BesuGatewayWithAdapters",
    "address": "http://satp-hermes-gateway-besu",
    "gatewayClientPort": 3011,
    "gatewayServerPort": 3010,
    "gatewayOapiPort": 4010
  },
  "adapterConfigPath": "/opt/cacti/satp-hermes/config/adapter/adapter-config.yml"
}
```

### Gateway Configuration (Generated)

**Location:** `tmp/gateway1-config.json` and `tmp/gateway2-config.json`

Generated configs include full multi-gateway setup with:
- Unique gateway identifiers
- Counter-party gateway references
- Besu network connection details
- Bridge contract configuration
- Key pairs for signing

Example structure:
```json
{
  "gid": {
    "id": "mockID-besu-gw1",
    "name": "BesuGateway1",
    "address": "http://satp-hermes-gateway-1",
    "gatewayClientPort": 3011,
    "gatewayServerPort": 3010,
    "gatewayOapiPort": 4010
  },
  "counterPartyGateways": [
    {
      "id": "mockID-besu-gw2",
      "name": "BesuGateway2",
      "address": "http://host.docker.internal",
      "gatewayClientPort": 3021,
      "gatewayServerPort": 3020,
      "gatewayOapiPort": 4020
    }
  ],
  "ccConfig": {
    "bridgeConfig": [
      {
        "network": "BESU",
        "wrapperContractAddress": "<DEPLOYED_ADDRESS>",
        "networkConfig": {
          "url": "http://host.docker.internal:8545",
          "wsUrl": "ws://host.docker.internal:8546"
        }
      }
    ]
  },
  "adapterConfigPath": "/opt/cacti/satp-hermes/config/adapter-config.yml"
}
```

### Adapter Configuration (Static)

**Location:** `src/examples/config/adapter/satp-gateway1-simple-deployed-adapter.adapter-config.yml`

This YAML file configures webhook adapters:

```yaml
adapters:
  - id: "newSessionRequest-outbound-validator"
    name: "New Session Request Validator"
    description: "Validates new session request before processing"
    executionPoints:
      - stage: "stage0"
        step: newSessionRequest
        point: "before"
    outboundWebhook:
      url: "http://localhost:9223/webhook/outbound/validate"
      timeoutMs: 5000
      retryAttempts: 3
      retryDelayMs: 1000
    active: true
    priority: 1

  - id: "newSessionRequest-inbound-approval"
    name: "New Session Request Approval"
    description: "Awaits external approval after session request processing"
    executionPoints:
      - stage: "stage0"
        step: newSessionRequest
        point: "after"
    inboundWebhook:
      timeoutMs: 3000
    active: true
    priority: 2

global:
  timeoutMs: 5000
  retryAttempts: 3
  retryDelayMs: 500
  logLevel: "debug"
```

## Makefile Commands

The `src/examples/docker-adapter-test.mk` makefile provides the following commands:

### Build Operations

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk build` | Build the Docker image |
| `make -f src/examples/docker-adapter-test.mk build-no-cache` | Build without Docker cache |

### Contract Deployment

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk deploy-contracts` | Deploy SATPWrapperContract to both Besu networks |
| `make -f src/examples/docker-adapter-test.mk deploy-contracts-besu1` | Deploy to Besu network 1 (port 8545) |
| `make -f src/examples/docker-adapter-test.mk deploy-contracts-besu2` | Deploy to Besu network 2 (port 8547) |
| `make -f src/examples/docker-adapter-test.mk init-bridge` | Initialize bridge connections between gateways |

### Config Generation

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk create-temp-dir` | Create temp directory for configs |
| `make -f src/examples/docker-adapter-test.mk create-configs` | Generate all config files (JSON + YAML) |
| `make -f src/examples/docker-adapter-test.mk create-config-gw1` | Generate gateway 1 JSON config |
| `make -f src/examples/docker-adapter-test.mk create-config-gw2` | Generate gateway 2 JSON config |
| `make -f src/examples/docker-adapter-test.mk create-adapter-gw1` | Generate gateway 1 adapter YAML (5-min timeout) |
| `make -f src/examples/docker-adapter-test.mk create-adapter-gw2` | Generate gateway 2 adapter YAML (5-min timeout) |
| `make -f src/examples/docker-adapter-test.mk clean-configs` | Remove generated config files |

### Single Gateway Operations

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk run` | Run container in detached mode |
| `make -f src/examples/docker-adapter-test.mk run-interactive` | Run container in interactive mode |
| `make -f src/examples/docker-adapter-test.mk stop` | Stop the running container |
| `make -f src/examples/docker-adapter-test.mk logs` | View container logs (follow) |
| `make -f src/examples/docker-adapter-test.mk logs-tail` | View last 100 lines of logs |
| `make -f src/examples/docker-adapter-test.mk shell` | Open shell in running container |

### Multi-Gateway Operations

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk run-gateway1` | Run gateway 1 (ports 3010/3011/4010) |
| `make -f src/examples/docker-adapter-test.mk run-gateway2` | Run gateway 2 (ports 3020/3021/4020) |
| `make -f src/examples/docker-adapter-test.mk run-both` | Run both gateways simultaneously |
| `make -f src/examples/docker-adapter-test.mk stop-gateway1` | Stop gateway 1 container |
| `make -f src/examples/docker-adapter-test.mk stop-gateway2` | Stop gateway 2 container |
| `make -f src/examples/docker-adapter-test.mk stop-all` | Stop both gateway containers |
| `make -f src/examples/docker-adapter-test.mk logs-gw1` | View gateway 1 logs |
| `make -f src/examples/docker-adapter-test.mk logs-gw2` | View gateway 2 logs |
| `make -f src/examples/docker-adapter-test.mk healthcheck-gw1` | Health check gateway 1 |
| `make -f src/examples/docker-adapter-test.mk healthcheck-gw2` | Health check gateway 2 |

### Full Deployment Pipeline

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk deploy-bridge` | Full deployment: contracts → configs → both gateways |
| `make -f src/examples/docker-adapter-test.mk setup` | Build image and run single container |

### Test Operations

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk healthcheck` | Check gateway health |
| `make -f src/examples/docker-adapter-test.mk integrations` | Get gateway integrations |
| `make -f src/examples/docker-adapter-test.mk sessions` | Get all sessions |
| `make -f src/examples/docker-adapter-test.mk test` | Run all adapter tests |

### Cleanup Operations

| Command | Description |
|---------|-------------|
| `make -f src/examples/docker-adapter-test.mk clean` | Stop container and remove image |
| `make -f src/examples/docker-adapter-test.mk clean-all` | Remove all related images |
| `make -f src/examples/docker-adapter-test.mk clean-configs` | Remove generated config files |
| `make -f src/examples/docker-adapter-test.mk clean-full` | Full cleanup: containers + configs + images |

## API Endpoints

Once the gateway is running, the following endpoints are available:

### Health Check
```bash
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq .
```
**Response:**
```json
{
  "status": "AVAILABLE"
}
```

### Get Integrations
```bash
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations | jq .
```

### Get All Sessions
```bash
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids | jq .
```

### Get Session Status
```bash
curl -s "http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/status?sessionId=<SESSION_ID>" | jq .
```

### Initiate Transaction
```bash
curl -X POST http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/transact \
  -H "Content-Type: application/json" \
  -d '{ ... }' | jq .
```

## Adapter Configuration

### Adapter Types

| Type | Direction | Purpose |
|------|-----------|---------|
| **Outbound Webhooks** | Gateway → External System | Notify external systems about SATP events |
| **Inbound Webhooks** | External System → Gateway | Allow external systems to approve/reject transfers |

### Execution Points

Adapters can be configured to execute at specific points:

- **Stages**: 0 (Initialization), 1 (Transfer Agreement), 2 (Lock Evidence), 3 (Commitment)
- **Steps**: Protocol steps within each stage (e.g., `newSessionRequest`, `checkTransferProposalRequestMessage`)
- **Points**: `before`, `during`, `after`, or `rollback`

### Available Test Fixtures

The following adapter configuration fixtures are available in `src/test/yaml/fixtures/`:

| File | Description |
|------|-------------|
| `adapter-configuration-newSessionRequest.yml` | Stage 0 newSessionRequest focused |
| `adapter-configuration-simple.example.yml` | Simple adapter example |
| `adapter-configuration.example.yml` | Full comprehensive example |
| `adapter-configuration-integration-test.yml` | Integration test configuration |
| `adapter-configuration-test-server.yml` | E2E test server configuration |
| `adapter-configuration-test-server-simple.yml` | Simplified test server config |

### Generated Adapter Configuration (5-Minute Timeout)

When using `make -f src/examples/docker-adapter-test.mk create-configs`, the generated adapter configs use a **5-minute (300,000ms) timeout** for all webhook operations. This extended timeout is useful for manual testing and debugging.

Example generated config (`tmp/gateway1-adapter-config.yml`):
```yaml
adapters:
  - id: "outbound-webhook-adapter"
    name: "Outbound Webhook Adapter"
    description: "Outbound webhook for gateway 1"
    executionPoints:
      - stage: "stage0"
        step: newSessionRequest
        point: "before"
    outboundWebhook:
      url: "http://host.docker.internal:9223/webhook/outbound"
      timeoutMs: 300000
      retryAttempts: 3
      retryDelayMs: 1000
    active: true
    priority: 1
  - id: "inbound-webhook-adapter"
    name: "Inbound Webhook Adapter"
    description: "Inbound webhook for gateway 1"
    executionPoints:
      - stage: "stage0"
        step: newSessionRequest
        point: "after"
    inboundWebhook:
      timeoutMs: 300000
    active: true
    priority: 2
global:
  timeoutMs: 300000
  retryAttempts: 3
  retryDelayMs: 500
  logLevel: "debug"
```

## Configuration Variables

The makefile supports customization through environment variables:

### Gateway Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GW1_GID` | `gateway1-besu-adapter` | Gateway 1 identifier |
| `GW1_NAME` | `BesuGateway1` | Gateway 1 display name |
| `GW1_SERVER_PORT` | `3010` | Gateway 1 server port |
| `GW1_CLIENT_PORT` | `3011` | Gateway 1 client port |
| `GW1_API_PORT` | `4010` | Gateway 1 API port |
| `GW2_GID` | `gateway2-besu-adapter` | Gateway 2 identifier |
| `GW2_NAME` | `BesuGateway2` | Gateway 2 display name |
| `GW2_SERVER_PORT` | `3020` | Gateway 2 server port |
| `GW2_CLIENT_PORT` | `3021` | Gateway 2 client port |
| `GW2_API_PORT` | `4020` | Gateway 2 API port |

### Besu Network Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BESU1_RPC_HTTP` | `http://host.docker.internal:8545` | Besu network 1 RPC endpoint |
| `BESU1_RPC_WS` | `ws://host.docker.internal:8546` | Besu network 1 WebSocket endpoint |
| `BESU2_RPC_HTTP` | `http://host.docker.internal:8547` | Besu network 2 RPC endpoint |
| `BESU2_RPC_WS` | `ws://host.docker.internal:8548` | Besu network 2 WebSocket endpoint |
| `ETH_ACCOUNT` | `0xf39Fd6e...` | Ethereum account for contract deployment |
| `ETH_PRIVATE_KEY` | `0xac0974...` | Private key for contract deployment |

### Adapter Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ADAPTER_TIMEOUT_MS` | `300000` | Webhook timeout in milliseconds (5 minutes) |
| `WEBHOOK_SERVER_PORT` | `9223` | Port for the local webhook test server |
| `WEBHOOK_SERVER_HOST` | `host.docker.internal` | Host used by gateways to reach the webhook server |

### Customization Example

```bash
# Deploy with custom timeout (10 minutes)
ADAPTER_TIMEOUT_MS=600000 make -f src/examples/docker-adapter-test.mk create-configs

# Use different Besu ports
BESU1_RPC_HTTP=http://host.docker.internal:9545 make -f src/examples/docker-adapter-test.mk deploy-contracts-besu1
```

## Troubleshooting

### Container Won't Start

1. Check if ports are already in use:
   ```bash
   lsof -i :3010 -i :3011 -i :4010
   ```

2. Check container logs:
   ```bash
   docker logs satp-test-adapter
   ```

### Makefile Build Path Error

If you encounter this error when running `make -f src/examples/docker-adapter-test.mk build`:
```
ERROR: failed to build: unable to prepare context: path "packages/cactus-plugin-satp-hermes" not found
```

This occurs because the Makefile uses a relative path that expects to be run from the repository root. **Workaround:** Run the Docker build command directly from within the `packages/cactus-plugin-satp-hermes` directory:

```bash
cd packages/cactus-plugin-satp-hermes

# Build manually with correct context path
docker build --pull --rm \
  -f satp-hermes-gateway.Dockerfile \
  -t satp-hermes-gateway-adapter-test:latest \
  .
```

### WSL 2 Docker Not Found

If you see this error in WSL 2:
```
The command 'docker' could not be found in this WSL 2 distro.
```

Ensure Docker Desktop has WSL 2 integration enabled:
1. Open Docker Desktop → Settings → Resources → WSL Integration
2. Enable integration for your WSL 2 distro
3. Restart your terminal and verify with `docker --version`

Alternatively, if Docker is installed but not in PATH, check:
```bash
which docker && docker info
```

### Configuration Not Found Error

Ensure the configuration files are mounted correctly:
```bash
docker inspect satp-test-adapter | jq '.[0].Mounts'
```

The gateway expects:
- Gateway config at: `/opt/cacti/satp-hermes/config/config.json`
- Adapter config at: `/opt/cacti/satp-hermes/config/adapter-config.yml`

### Health Check Fails

1. Wait for the gateway to fully start (usually 5-10 seconds)
2. Check if the container is running:
   ```bash
   docker ps | grep satp-test-adapter
   ```

3. View startup logs:
   ```bash
   docker logs --tail 50 satp-test-adapter
   ```

### Docker-in-Docker Warnings

You may see warnings about `dockerd` failing inside the container. This is expected when running without Docker socket access and does not affect gateway functionality:
```
WARN exited: dockerd (exit status 1; not expected)
```

### Clean Restart

For a fresh start:
```bash
make -f src/examples/docker-adapter-test.mk clean
make -f src/examples/docker-adapter-test.mk build-no-cache
make -f src/examples/docker-adapter-test.mk run
```

## Related Documentation

- [SATP Hermes README](../README.md)
- [Adapter Layer Configuration](../src/examples/config/README.md)
- [IETF SATP Protocol Specification](https://datatracker.ietf.org/doc/html/draft-ietf-satp-core)

## Quick Verification Commands

After the gateway is running, use these commands to verify everything is working:

```bash
# Health check
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq .
# Expected: {"status": "AVAILABLE"}

# Check integrations (connected DLTs)
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations | jq .

# List active sessions
curl -s http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids | jq .

# View container logs (adapter activity)
docker logs --tail 50 satp-test-adapter

# Filter logs for adapter-related messages
docker logs satp-test-adapter 2>&1 | grep -i -E "(adapter|webhook|hook)"

# Check container status
docker ps --filter "name=satp-test-adapter" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Known Limitations

1. **Docker-in-Docker**: The container runs `dockerd` internally, which will fail if Docker socket is not mounted. This doesn't affect gateway functionality.

2. **Fabric Configuration Warnings**: You may see `isFabricConfigJSON: channelName missing` errors in logs if only Besu is configured. This is expected and doesn't affect Besu operations.

3. **Build Time**: Initial Docker image build takes ~7-10 minutes due to dependency installation.

4. **Port Conflicts**: Ensure ports 3010, 3011, and 4010 are available before starting the container.
