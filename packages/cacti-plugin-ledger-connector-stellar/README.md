# `@hyperledger/cacti-plugin-ledger-connector-stellar`

This plugin provides `Cacti` a way to interact with Stellar networks. Using this we can perform:

- Deploy Smart-contracts over the network.
- Build and sign transactions.
- Invoke smart-contract functions that we have deployed on the network.

## Summary

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Usage](#usage)
- [Prometheus Exporter](#prometheus-exporter)
- [Runing the tests](#running-the-tests)
- [Built With](#built-with)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Prerequisites

In the root of the Cacti project to install the dependencies execute the command:

```sh
npm run enable-corepack
yarn configure
```

### Compiling

In the project root folder, run this command to compile the plugin and create the dist directory:

```sh
yarn tsc
```

### Architecture

The Stellar Ledger Connector offers a variaty of endpoints to handle specific actions for a given Stellar network.

#### `deploy-contract` endpoint

This endpoint is responsible for deploying smart contracts to Soroban (Stellar's smart contract platform).

**Core Aspects**:

- **Input**: Accepts either a compiled WASM buffer or a WASM hash.

  - `wasmBuffer`: Uploads compiled code to Stellar, generates a on-chain WASM hash, then deploys the contract. Refer to the [Stellar documentation](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/contracts) for further detail on this process.
  - `wasmHash`: Directly deploys the contract using the existing WASM hash.
  - `transactionInvocation`: An object containing data about how the transaction should be assembled and executed.

- **Output**: An object containing the on-chain WASM hash and a unique contract ID of the newly deployed instance.

#### `run-soroban-transaction` endpoint

This endpoint is responsible for invoking smart contracts on Soroban (Stellar's smart contract platform) to either change or read a ledger state.

**Core Aspects**:

- **Input**: Accepts either a compiled WASM buffer or a WASM hash.
  - `contractId`: The unique contract id of the contract instance to be invoked.
  - `method`: The name of the contract method being invoked.
  - `methodArgs`: An object containing the arguments accepted by the method.
  - `specXdr`: An array containing the contract specification in XDR format.
  - `transactionInvocation`: An object containing data about how the transaction should be assembled and executed.
  - `readOnly`: A flag to indicate when the transaction should not alter ledger state. When `true`, the transaction will only be simulated based on the current ledger state and provide an up-to-date output without registering the transaction to the ledger, ensuring no fees are consumed.
- **Output**: An object containing the response of the transaction invocation.
  - `result`: The direct output of the invoked contract method.

### Usage

#### Initialization

To use this import public-api and create new **PluginFactoryLedgerConnector**. Then use it to create a connector.

```typescript
const factory = new PluginFactoryLedgerConnector({
  pluginImportType: PluginImportType.LOCAL,
});
const connector: PluginLedgerConnectorStellar = await factory.create({
  networkConfig,
  pluginRegistry: new PluginRegistry({}),
  instanceId: uuidV4(),
});
```

A key element of the connector intialization is the provided `networkConfig` object. It follows the standard format defined in the open source library [Stellar Plus](https://github.com/CheesecakeLabs/stellar-plus) and can be assembled by the `CustomNet()` function provided by it as well as the most common network environments for Stellar such as the `TestNet()` for Stellar testnet or `FutureNet()` for early features and protocol changes validation.

When using the _Stellar Test Ledger_ provided under the Cacti Test tooling, the network can be assembled using the `CustomNet()` function combined with the test ledger `getNetworkConfiguration()` method. Once the test ledger has been fully started, it exposes the configuration parameters for all its services. See the following example:

```typescript
const stellarTestLedger = new StellarTestLedger({ logLevel });

await stellarTestLedger.start();
const networkConfig = CustomNet(
  await stellarTestLedger.getNetworkConfiguration(),
);
```

#### Making Calls

One can make calls through the connector to the plugin API:

```typescript
async deployContract(req: DeployContractV1Request):Promise<DeployContractV1Response>;
```

Call example to deploy a contract:

```typescript
const deployOut = await connector.deployContract({
  wasmBuffer: wasmBuffer.toString("base64"),
  transactionInvocation: {
    header: {
      source: deployerAccount.getPublicKey(),
      fee: 100,
      timeout: 30,
    },
    signers: [deployerAccount.getSecretKey()],
  },
});
```

Call example to invoke a contract and return the output value:

```typescript
const res = await connector.runSorobanTransaction({
  contractId,
  method: "balance",
  methodArgs: {
    id: adminAccount.getPublicKey(),
  },
  specXdr: tokenSpec,
  readOnly: true,
  transactionInvocation: {
    header: {
      source: adminAccount.getPublicKey(),
      fee: 100,
      timeout: 30,
    },
    signers: [adminAccount.getSecretKey()],
  },
});
```

### Building/running the container image locally

In the Cacti project root say:

```sh
DOCKER_BUILDKIT=1 docker build -f ./packages/cacti-plugin-ledger-connector-stellar/Dockerfile . --tag cplcs --tag cacti-plugin-ledger-connector-stellar
```

Build with a specific version of the npm package:

```sh
DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=2.0.0-rc.1 -f ./packages/cacti-plugin-ledger-connector-stellar/Dockerfile . --tag cplcs --tag cacti-plugin-ledger-connector-stellar
```

#### Running the container

Launch container with plugin configuration as an **environment variable**:

```sh
docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env PLUGINS='[{"packageName": "@hyperledger/cacti-plugin-ledger-connector-stellar", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": { "instanceId": "some-unique-stellar-connector-instance-id"}}]' \
  cplcs
```

Launch container with plugin configuration as a **CLI argument**:

```sh
docker run \
  --rm \
  --publish 3000:3000 \
   --publish 4000:4000 \
  cplcs \
    ./node_modules/.bin/cactusapi \
    --plugins='[{"packageName": "@hyperledger/cacti-plugin-ledger-connector-stellar", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": { "instanceId": "some-unique-stellar-connector-instance-id"}}]'
```

Launch container with **configuration file** mounted from host machine:

```sh

echo '[{"packageName": "@hyperledger/cacti-plugin-ledger-connector-stellar", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": { "instanceId": "some-unique-stellar-connector-instance-id"}}]' > cactus.json

docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --mount type=bind,source="$(pwd)"/cactus.json,target=/cactus.json \
  cplcs \
    ./node_modules/.bin/cactusapi \
    --config-file=/cactus.json
```

#### Testing API calls with the container

Don't have a Stellar network on hand to test with? Test or develop against our Stellar All-In-One container by importing the `StellarTestLedger` from `cacti-test-tooling`. It will deploy and manage a docker image based on [Stellar quickstart](https://github.com/stellar/quickstart).

**Usage Example**(refer to the integration tests for further examples):

```typescript
import { StellarTestLedger } from "@hyperledger/cactus-test-tooling";
import { Network } from "stellar-plus/lib/stellar-plus";

const logLevel: LogLevelDesc = "TRACE";
const stellarTestLedger = new StellarTestLedger({ logLevel });

await stellarTestLedger.start();
const networkConfig = Network.CustomNet(
  await stellarTestLedger.getNetworkConfiguration(),
);

// Here use the networkConfig object to connect to
// your test ledger and run your tests.

await stellarTestLedger.stop();
await stellarTestLedger.destroy();
```

In this example, the `StellarTestLedger` is used to pull up a fresh new ledger with no history and all of its required services to interact with the network. In conjunction with the `stellar-plus` library, the method `getNetworkConfiguration` is used to get all services data and instantiate an object that can be used with all tools in Stellar Plus to directly interact with the test ledger.

## Prometheus Exporter

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Stellar connector plugin.

### Prometheus Exporter Usage

The prometheus exporter object is initialized in the `PluginLedgerConnectorStellar` class constructor itself, so instantiating the object of the `PluginLedgerConnectorStellar` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginLedgerConnectorStellarOptions` interface for `PluginLedgerConnectorStellar` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total transaction count, which currently increments everytime a Stellar transaction is executed through the connector internal methods. This includes the methods

- `deployContract`
- `runSorobanTransaction()`

### Prometheus Integration

To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'stellar_ledger_connector_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-stellar/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, `packages/cacti-plugin-ledger-connector-stellar/src/test/typescript/unit/get-open-api-spec-v1-connector-stellar.test.ts`) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-stellar/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cacti_stellar_total_tx_count** and click **execute**

### Helper code

###### response.type.ts

This file contains the various responses of the metrics.

###### data-fetcher.ts

This file contains functions encasing the logic to process the data points

###### metrics.ts

This file lists all the prometheus metrics and what they are used for.

## Running the tests

To check that all has been installed correctly and that the pugin has no errors run the tests:

- Run this command at the project's root:

```sh
yarn jest packages/cacti-plugin-ledger-connector-stellar/
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
