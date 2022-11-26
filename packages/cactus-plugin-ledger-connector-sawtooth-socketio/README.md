<!--
 Copyright 2021 Hyperledger Cactus Contributors
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# `@hyperledger/cactus-plugin-ledger-connector-sawtooth-socketio`

This plugin provides `Cactus` a way to interact with Hyperledger Sawtooth networks. Using this we can perform:
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
- Please ensure that the destination ledger (default: [sawtooth-all-in-one](../../tools/docker/sawtooth-all-in-one)) is already launched.

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
    mkdir -p /etc/cactus/connector-sawtooth-socketio/
    rm -r /etc/cactus/connector-sawtooth-socketio/*
    cp -rf ./sample-config/* /etc/cactus/connector-sawtooth-socketio/
    ```

### Docker
- This image depends on `cactus-cmd-socketio-server:latest` to be present in local store. **Make sure to follow docker build instructions in [cactus-cmd-socketio-server README](../../packages/cactus-cmd-socketio-server/README.md)) before bulding this image!**
- Docker build process will use artifacts from the latest build. Make sure `./dist` contains the version you want to dockerize.

```
# Build
pushd ../../packages/cactus-cmd-socketio-server/ && docker build . -t cactus-cmd-socketio-server && popd
docker build . -t cactus-plugin-ledger-connector-sawtooth-socketio

# Run
docker run -v/etc/cactus/:/etc/cactus -p 5140:5140 cactus-plugin-ledger-connector-sawtooth-socketio
```

### Manual
- Ensure ledger ports are exposed to the host first.

```
npm run start
```

## Configuration
- Validator can be configured in `/etc/cactus/connector-sawtooth-socketio/default.yaml` (see [sample-config](./sample-config/default.yaml) for details).
- This configuration can be overwriten in `NODE_CONFIG` environment variable (JSON format).

## Usage samples
- To confirm the operation of this package, please refer to the following business-logic sample application:
    - [cactus-example-electricity-trade](../../examples/cactus-example-electricity-trade)

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there's always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
