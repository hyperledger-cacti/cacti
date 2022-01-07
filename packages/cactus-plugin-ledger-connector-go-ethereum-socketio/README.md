<!--
 Copyright 2021 Hyperledger Cactus Contributors
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# `@hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio`

This plugin provides `Cactus` a way to interact with Go-Ethereum networks. Using this we can perform:
- `sendSyncRequest`: Send sync-typed requests to the ledgers (e.g. getBalance)
- `sendAsyncRequest`: Send async-typed requests to the ledgers (e.g. sendTransaction)
- `startMonitor`: Start monitoring blocks on the ledgers
- `stopMonitor`: Stop the block monitoring

## Summary
- [Getting started](#getting-started)
- [Usage samples](#usage-samples)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Getting started

### Required software components
- OS: Linux (recommended Ubuntu20.04,18.04 or CentOS7)
- Docker (recommend: v17.06.2-ce or greater)
- Docker-compose (recommend: v1.14.0 or greater)
- node.js v12 (recommend: v12.20.2 or greater)

### Prerequisites
- Please ensure that the destination ledger (default: [geth-testnet](../../tools/docker/geth-testnet)) is already launched
- Available port: `5050` (for the port of `@hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio`)
  - if this port is already used, please change the setting on `docker-compose.yaml`

### Boot methods
#### 1. Run configure command from the project root directory:
```
npm run configure
```

#### 2. Go to the go-ethereum connector package directory:
```
cd cactus/packages/cactus-plugin-ledger-connector-go-ethereum-socketio
```

#### 3. Create the docker image
```
docker-compose -f docker-compose.yaml build
```

#### 4. Launch the container
```
docker-compose -f docker-compose.yaml up
```

## Usage samples
- To confirm the operation of this package, please refer to the following business-logic sample applications:
    - [electricity-trade](../../examples/electricity-trade)
    - [car-trade](../../examples/cartrade)

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there's always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments