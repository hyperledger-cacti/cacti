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
- node.js v12 (recommend: v12.20.2 or greater)

### Prerequisites
- Please ensure that the destination ledger (default for samples: [geth-testnet](../../tools/docker/geth-testnet)) is already launched.

## Boot methods

### Common setup
1. Always run configure command first, from the project root directory:
    ```
    pushd ../..
    npm run configure
    popd
    ```

1. Copy default configuration
- **Remember to replace default CA and to adjust the `default.yaml` configuration on production deployments!**
    ```
    mkdir -p /etc/cactus/connector-go-ethereum-socketio/
    rm -r /etc/cactus/connector-go-ethereum-socketio/*
    cp -rf ./sample-config/* /etc/cactus/connector-go-ethereum-socketio/
    ```

### Docker
- This image depends on `cactus-cmd-socketio-server:latest` to be present in local store. **Make sure to follow docker build instructions in [cactus-cmd-socketio-server README](../../packages/cactus-cmd-socketio-server/README.md)) before bulding this image!**
- Docker build process will use artifacts from the latest build. Make sure `./dist` contains the version you want to dockerize.

```
# Build
pushd ../../packages/cactus-cmd-socketio-server/ && docker build . -t cactus-cmd-socketio-server && popd
docker build . -t cactus-plugin-ledger-connector-go-ethereum-socketio

# Run
docker run -v/etc/cactus/:/etc/cactus -p 5050:5050 cactus-plugin-ledger-connector-go-ethereum-socketio
```

### Manual
- Ensure ledger ports are exposed to the host first.

```
npm run start
```

## Configuration
- Validator can be configured in `/etc/cactus/connector-go-ethereum-socketio/default.yaml` (see [sample-config](./sample-config/default.yaml) for details).
- This configuration can be overwriten in `NODE_CONFIG` environment variable (JSON format).

## Usage samples
- To confirm the operation of this package, please refer to the following business-logic sample applications:
    - [cactus-example-electricity-trade](../../examples/cactus-example-electricity-trade)
    - [cactus-example-discounted-asset-trade](../../examples/cactus-example-discounted-asset-trade)

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there's always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
