# `@hyperledger/cactus-plugin-ledger-connector-sawtooth`

This plugin provides `Cacti` a way to interact with Sawtooth networks. Using this we can perform:

- Check plugin and sawtooth node status.
- Monitor new blocks and transactions on the ledger.

## Summary

- [Getting Started](#getting-started)
- [Usage](#usage)
- [SawtoothApiClient](#sawtoothapiclient)
- [Runing the tests](#running-the-tests)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Prerequisites

In the root of the project to install the dependencies execute the command:

```sh
npm run configure
```

## Usage

Before running the connector please ensure that Sawtooth node is running and that connector will have direct access to it. Access through a proxy is not supported yet (see https://sawtooth.hyperledger.org/docs/1.2/sysadmin_guide/rest_auth_proxy.html).
To use this import public-api and create new **PluginLedgerConnectorSawtooth**.

```typescript
const connector = new PluginLedgerConnectorSawtooth({
  instanceId: uuidV4(),
  logLevel: testLogLevel,
  sawtoothRestApiEndpoint: ledgerRestApi,
  watchBlocksPollTime,
});
```

You can make calls through the connector to the plugin API:

```typescript
async getStatus(): Promise<StatusResponseV1>
```

Please note that `deployContract()` and `transact()`, although available to call, **are not implemented and will throw error on runtime!**

## SawtoothApiClient

All connector API endpoints are defined in [open-api specification](./src/main/json/openapi.json). You can use [SawtoothApiClient](./src/main/typescript/api-client) to call remote sawtooth connector functions. It also contain additional utility functions to ease integration.

### REST Functions

See [DefaultApi](./src/main/typescript/generated/openapi/typescript-axios/api.ts) for up-to-date listing of supported endpoints.

- getStatusV1

### Asynchronous Functions (socket.io)

- watchBlocksV1

## Running the tests

To check that all has been installed correctly and that the plugin has no errors run jest test suites.

- Run this command at the project's root:

```sh
npx jest cactus-plugin-ledger-connector-sawtooth
```

### Building/running the container image locally

In the Cactus project root say:

```sh
DOCKER_BUILDKIT=1 docker build -f ./packages/cactus-plugin-ledger-connector-sawtooth/Dockerfile . -t cplcb
```

Build with a specific version of the npm package:

```sh
DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=0.4.1 -f ./packages/cactus-plugin-ledger-connector-sawtooth/Dockerfile . -t cplcb
```

#### Running the container

Launch container with plugin configuration as an **environment variable**:

```sh
docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env AUTHORIZATION_PROTOCOL='NONE' \
  --env AUTHORIZATION_CONFIG_JSON='{}' \
  --env PLUGINS='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-sawtooth", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-sawtooth-connector-instance-id"}}]' \
  cplcb
```

Launch container with plugin configuration as a **CLI argument**:

```sh
docker run \
  --rm \
  --publish 3000:3000 \
   --publish 4000:4000 \
  cplcb \
    ./node_modules/@hyperledger/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js \
    --authorization-protocol='NONE' \
    --authorization-config-json='{}' \
    --plugins='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-sawtooth", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-sawtooth-connector-instance-id"}}]'
```

Launch container with **configuration file** mounted from host machine:

```sh

echo '{"authorizationProtocol":"NONE","authorizationConfigJson":{},"plugins":[{"packageName":"@hyperledger/cactus-plugin-ledger-connector-sawtooth","type":"org.hyperledger.cactus.plugin_import_type.LOCAL","action":"org.hyperledger.cactus.plugin_import_action.INSTALL","options":{"rpcApiHttpHost":"http://localhost:8545","instanceId":"some-unique-sawtooth-connector-instance-id"}}]}' > cactus.json

docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --mount type=bind,source="$(pwd)"/cactus.json,target=/cactus.json \
  cplcb \
    ./node_modules/@hyperledger/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js \
    --config-file=/cactus.json
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
- This plugin uses Sawtooth REST API OpenAPI specification from https://sawtooth.hyperledger.org/docs/1.2/rest_api/openapi/. We did some changes to the original spec in order to simplify request handling (e.g. change type, mark fields as requried, etc...)
