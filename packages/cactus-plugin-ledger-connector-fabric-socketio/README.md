<!--
 Copyright 2021 Hyperledger Cactus Contributors
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# `@hyperledger/cactus-plugin-ledger-connector-fabric-socketio`

This plugin provides `Cactus` a way to interact with Hyperledger Fabric networks. Using this we can perform:
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
- Please ensure that the destination ledger (default for samples: [fabric-all-in-one](../../tools/docker/fabric-all-in-one/)) is already launched.
- Available port:
    - `5040` (for the port of `@hyperledger/cactus-plugin-ledger-connector-fabric-socketio`)
    - if this port is already used, you can specify custom one when starting the container.

## Boot methods
1. Always run configure command first, from the project root directory:
    ```
    pushd ../..
    npm run configure
    popd
    ```

1. Setup the wallet
    ```
    mkdir -p /etc/cactus/fabric/wallet/
    rm -r /etc/cactus/fabric/wallet/
    # Optionally copy existing fabric wallet to that location
    ```

### Docker
```
# Build
docker build . -t cactus-plugin-ledger-connector-fabric-socketio

# Run
docker run -v/etc/cactus/:/etc/cactus -p 5040:5040 cactus-plugin-ledger-connector-fabric-socketio
```

### Manual
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