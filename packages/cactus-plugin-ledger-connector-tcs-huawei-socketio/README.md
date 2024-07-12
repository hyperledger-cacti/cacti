<!--
 Copyright 2021 Hyperledger Cactus Contributors
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# `@hyperledger/cactus-plugin-ledger-connector-tcs-huawei-socketio`

This plugin provides `Cactus` a way to interact with tcs-huawei networks.tcs-huawei  (Trusted Cross-chain Service-Huawei) is a blockchain integration service on Huawei Cloud.  Using this we can perform:
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
- node.js v16 (recommend: v16 or greater)

### Prerequisites
- Please ensure that the destination ledger (default: [tcs-huawei](../../tools/docker/tcs-huawei-testnet)) is already launched.

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
    mkdir -p /etc/cactus/connector-tcs-huawei-socketio/
    rm -r /etc/cactus/connector-tcs-huawei-socketio/*
    cp -rf ./sample-config/* /etc/cactus/connector-tcs-huawei-socketio/
    ```

### Docker
```
# Build
docker build . -t cactus-plugin-ledger-connector-tcs-huawei-socketio


```

### Manual
- Ensure ledger ports are exposed to the host first.

```
npm run start
```

## Usage samples
- To confirm the operation of this package, please refer to the following business-logic sample application:
    - [cactus-example-electricity-trade](../../examples/cactus-example-electricity-trade)

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there's always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
