# SATP Gateway Configuration Examples

This directory contains comprehensive configuration examples for the SATP Hermes gateway implementation. These configurations demonstrate various deployment scenarios and use cases for cross-chain asset transfers.

## Source and Attribution

These configuration examples are inspired by and derived from the [SATP Gateway Demo](https://github.com/RafaelAPB/satp-gateway-demo) repository, by André Augusto, which provides reference implementations and working examples of SATP gateway configurations in practice.

## Available Configuration Templates

These configurations are based on working examples from the [SATP Gateway Demo](https://github.com/RafaelAPB/satp-gateway-demo) repository and are known to work in practice.

### Oracle Configurations

Oracle configurations use the `oracleConfig` section and are suitable for scenarios where the gateway acts as an oracle for cross-chain operations.

#### 1. `oracle-case1-config.json`
**Use Case**: Single network oracle setup

**Features**:
- Single Ethereum network (HardhatTestNetwork1)
- HTTP RPC connection via Docker internal host
- Standard gas configuration for test environments
- Claim format type 2 for oracle operations

**Best For**: Simple single-chain oracle testing, basic development environments.

#### 2. `oracle-case2-config.json`
**Use Case**: Dual network oracle setup with HTTP connections

**Features**:
- Two Ethereum networks (HardhatTestNetwork1 and HardhatTestNetwork2)
- HTTP RPC connections to both networks
- Separate signing credentials for each network
- Dual oracle configuration for cross-chain operations

**Best For**: Cross-chain oracle operations between two Ethereum-compatible networks, testing multi-network scenarios.

#### 3. `oracle-case3-config.json`
**Use Case**: Alternative single network oracle setup

**Features**:
- Single Ethereum network configuration (alternative to Case 1)
- HTTP RPC connection
- Standard oracle configuration
- Development environment settings

**Best For**: Alternative single-chain oracle setup, different test scenarios.

#### 4. `oracle-case4-config.json`  
**Use Case**: Dual network oracle with mixed connection types

**Features**:
- Two Ethereum networks with different connection types
- Network 1: WebSocket connection (ws://)
- Network 2: HTTP connection (http://)
- Mixed connectivity for testing different connection patterns

**Best For**: Testing different RPC connection types, WebSocket vs HTTP performance comparison.

### SATP Bridge Configurations

SATP configurations use the `bridgeConfig` section and include additional gateway-specific settings for full SATP protocol implementation.

#### 5. `satp-gateway1-config.json`
**Use Case**: SATP Gateway 1 in a two-gateway setup

**Features**:
- Gateway ID: mockID-1
- Connected to HardhatTestNetwork1
- Counter-party gateway configuration (Gateway 2)
- Full cryptographic key pair configuration
- Bridge configuration with claim format type 1
- Crash recovery disabled for development
- Ontology path configuration

**Best For**: SATP protocol testing, gateway-to-gateway communication, full protocol implementation.

#### 6. `satp-gateway2-config.json`
**Use Case**: SATP Gateway 2 in a two-gateway setup

**Features**:
- Gateway ID: mockID-2
- Connected to HardhatTestNetwork2  
- Counter-party gateway configuration (Gateway 1)
- Different cryptographic key pair from Gateway 1
- Bridge configuration for the second network
- Matching protocol versions with Gateway 1

**Best For**: Complete SATP protocol testing, paired with Gateway 1 for end-to-end testing.

## Configuration Structure

All configuration files follow this standardized structure based on the SATP protocol specification:

### Common Structure (All Configurations)
```json
{
  "gid": {
    "id": "gateway-identifier",
    "name": "CustomGateway",
    "version": [
      {
        "Core": "v02",
        "Architecture": "v02", 
        "Crash": "v02"
      }
    ],
    "address": "http://gateway-address",
    "gatewayClientPort": 3011,
    "gatewayServerPort": 3010,
    "gatewayOapiPort": 4010
  },
  "logLevel": "TRACE|DEBUG|INFO|WARN|ERROR",
  "counterPartyGateways": [ ... ],
  "environment": "development|staging|production",
  "ccConfig": { ... }
}
```

### Oracle Configuration Structure
```json
{
  "ccConfig": {
    "oracleConfig": [
      {
        "networkIdentification": {
          "id": "network-id",
          "ledgerType": "ETHEREUM"
        },
        "signingCredential": {
          "transactionSignerEthAccount": "0x...",
          "secret": "0x...",
          "type": "PRIVATE_KEY_HEX"
        },
        "gasConfig": {
          "gas": "6721975",
          "gasPrice": "20000000000"
        },
        "connectorOptions": {
          "rpcApiHttpHost": "http://..." 
        },
        "claimFormats": [2]
      }
    ]
  }
}
```

### SATP Bridge Configuration Structure
```json
{
  "ccConfig": {
    "bridgeConfig": [ ... ]
  },
  "keyPair": {
    "privateKey": "hex-private-key",
    "publicKey": "hex-public-key"
  },
  "enableCrashRecovery": false,
  "ontologyPath": "/opt/cacti/satp-hermes/ontologies"
}
```

## Using Configuration Files

### TypeScript/JavaScript Usage

```typescript
import * as fs from 'fs';
import { FabricSatpGateway, BesuSatpGateway } from '@hyperledger/cactus-plugin-satp-hermes';

// Load configuration
const config = JSON.parse(fs.readFileSync('./fabric-to-besu-gateway.json', 'utf8'));

// Create gateway instance
const gateway = new FabricSatpGateway({
  name: config.gatewayConfig.name,
  instanceId: config.gatewayConfig.instanceId,
  dltIDs: config.gatewayConfig.dltIDs,
  // ... other configuration options
});
```

### Environment Variable Substitution

Configuration files support environment variable substitution using the `${VARIABLE_NAME}` syntax:

```json
{
  "database": {
    "local": {
      "connection": {
        "host": "${DB_HOST}",
        "port": "${DB_PORT}",
        "user": "${DB_USER}",
        "password": "${DB_PASSWORD}"
      }
    }
  }
}
```

Required environment variables for each configuration:

#### Development Configuration
```bash
# Minimal environment variables
export DB_HOST=localhost
export FABRIC_CONNECTOR_URL=http://localhost:4000
export BESU_CONNECTOR_URL=http://localhost:4001
```

#### Production Configuration
```bash
# Database
export DB_PASSWORD=your-secure-password
export AUDIT_DB_PASSWORD=audit-password
export DB_SSL_CA=path/to/ca.crt
export DB_SSL_KEY=path/to/client.key
export DB_SSL_CERT=path/to/client.crt

# Ledger connections
export ETHEREUM_ACCOUNT=0x...
export ETHEREUM_PRIVATE_KEY=0x...
export ETHEREUM_CONTRACT_ADDRESS=0x...
export INFURA_PROJECT_ID=your-project-id

# IPFS
export IPFS_AUTH_TOKEN=your-ipfs-token
export PINATA_API_KEY=your-pinata-key
export PINATA_SECRET_KEY=your-pinata-secret

# Monitoring
export PAGERDUTY_INTEGRATION_KEY=your-key
export SLACK_WEBHOOK_URL=https://hooks.slack.com/...
export SMTP_USER=alerts@company.com
export SMTP_PASSWORD=smtp-password

# Security
export OAUTH_CLIENT_ID=your-client-id
export OAUTH_CLIENT_SECRET=your-client-secret
export REDIS_PASSWORD=redis-password
export REGULATORY_API_KEY=regulatory-key
```

## Configuration Validation

Use the provided validation functions to ensure configuration correctness:

```typescript
import { validateConfiguration } from './gateway-configs';

try {
  validateConfiguration(config);
  console.log('Configuration is valid');
} catch (error) {
  console.error('Configuration validation failed:', error.message);
}
```

## Customization Guidelines

### Adding New Ledger Types

To add support for a new ledger type, extend the `ledgerConnections` section:

```json
{
  "ledgerConnections": {
    "yourLedger": {
      "type": "your-ledger-type",
      "networkId": "your-network-id",
      "connectorUrl": "http://your-connector:4000",
      "customConfig": {
        "specificOption1": "value1",
        "specificOption2": "value2"
      }
    }
  }
}
```

### Security Customization

Adjust security settings based on your deployment requirements:

```json
{
  "security": {
    "enableTLS": true,
    "enableMTLS": false,
    "certificatePath": "/path/to/cert.pem",
    "privateKeyPath": "/path/to/key.pem",
    "encryption": {
      "algorithm": "AES-256-GCM",
      "keyRotationInterval": "24h"
    }
  }
}
```

### Performance Tuning

Optimize performance for your specific use case:

```json
{
  "performance": {
    "sessionPoolSize": 100,
    "maxConcurrentTransfers": 50,
    "transferTimeout": "10m",
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMultiplier": 2,
      "initialBackoffMs": 1000
    }
  }
}
```

## Best Practices

1. **Security First**: Always use production-grade security in non-development environments
2. **Environment Separation**: Use different configurations for dev, staging, and production
3. **Secret Management**: Never commit secrets to version control
4. **Monitoring**: Enable comprehensive monitoring and alerting
5. **Documentation**: Document any custom configuration options
6. **Testing**: Validate configurations in test environments before production deployment
7. **Backup**: Maintain backup configurations and disaster recovery procedures

## Troubleshooting

### Common Configuration Issues

1. **Database Connection Failures**
   - Verify database credentials and connectivity
   - Check firewall rules and network access
   - Ensure SSL certificates are valid

2. **Ledger Connector Issues**
   - Confirm connector endpoints are accessible
   - Validate signing credentials
   - Check smart contract deployments

3. **IPFS Integration Problems**
   - Verify IPFS node availability
   - Check authentication tokens
   - Confirm network connectivity

4. **Monitoring Setup Issues**
   - Validate Prometheus endpoint configuration
   - Check Grafana dashboard accessibility
   - Test alerting webhook endpoints

For additional support, refer to the main SATP Hermes documentation or open an issue in the project repository.
