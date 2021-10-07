<!--
 Copyright 2021 Hyperledger Cactus Contributors
 SPDX-License-Identifier: Apache-2.0
 
 README.md
-->
# `@hyperledger/cactus-plugin-ledger-connector-fabric-socketio`

This plugin provides `Cactus` a way to interact with Hyperledger Sawtooth networks. Using this we can perform:
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
- OS: CentOS7
- node.js v12 (recommend: v12.20.2 or greater)

### Prerequisites
- Please ensure that the destination ledger (default: [fabric14-fabcar-testnet](../../tools/docker/fabric14-fabcar-testnet)) is already launched
- Available port:
	- `5040` (for the port of `@hyperledger/cactus-plugin-ledger-connector-fabric-socketio`)
	- if this port is already used, please change the setting on `docker-compose.yaml`

### Boot methods

- Go to the following directory:
	```
	cd cactus/packages/cactus-plugin-ledger-connector-fabric-socketio
	```

#### 1. Build the modules
- Install npm packages and build them
	```
	npm install
	npm run build
	```
- Create symbolic link to node_modules
	- NOTE: This command is enough to execute only once.
	```
	npm run init-fabric
	```

#### 2. Setting the wallet
- Setting the wallet for the validator
	```
	rm -r ./dist/connector/wallet
	cp -a wallet ./dist/connector/wallet
	```

#### 3. Launch the container
- Launce the container
	```
	npm run start
	```

## Usage samples
- To confirm the operation of this package, please refer to the following business-logic sample application:
	- [cartrade](../../examples/cartrade)

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there's always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments 