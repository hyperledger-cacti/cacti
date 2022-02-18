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

1. Copy default validator CA
    ```
    mkdir -p /etc/cactus/connector-go-ethereum-socketio/
    rm -r /etc/cactus/connector-go-ethereum-socketio/CA
    cp -rf ./src/main/typescript/common/core/sample-CA/ /etc/cactus/connector-go-ethereum-socketio/CA
    ```

### Docker
```
# Build
docker build . -t cactus-plugin-ledger-connector-go-ethereum-socketio

# Run
docker run -v/etc/cactus/:/etc/cactus -p 5050:5050 --net=geth1net cactus-plugin-ledger-connector-go-ethereum-socketio
```

### Manual
- Ensure ledger ports are exposed to the host first.

```
npm run start
```

## Usage samples
- To confirm the operation of this package, please refer to the following business-logic sample applications:
    - [electricity-trade](../../examples/electricity-trade)
    - [discounted-cartrade](../../examples/discounted-cartrade)

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there's always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
