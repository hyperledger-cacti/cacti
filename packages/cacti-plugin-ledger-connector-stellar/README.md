# `@hyperledger/cacti-plugin-ledger-connector-stellar`


## 🚧 **Package Under Construction** 🚧

This package is a skeleton for now with no exported modules at all.
Stay tuned for later improvements.

## 🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This plugin provides `Cacti` a way to interact with Stellar networks. Using this we can perform:
* Deploy Smart-contracts over the network.
* Build and sign transactions using different keystores.
* Invoke smart-contract functions that we have deployed on the network.
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

In the root of the project to install the dependencies execute the command:
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

TODO

### Usage

TODO

### Building/running the container image locally

In the Cacti project root say:

```sh
DOCKER_BUILDKIT=1 docker build -f ./packages/cacti-plugin-ledger-connector-stellar/Dockerfile . --tag cplcs --tag cacti-plugin-ledger-connector-stellar
```

Build with a specific version of the npm package:
```sh
DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=2.0.0-alpha.2 -f ./packages/cacti-plugin-ledger-connector-stellar/Dockerfile . --tag cplcs --tag cacti-plugin-ledger-connector-stellar
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

Don't have a Stellar network on hand to test with? Test or develop against our Stellar All-In-One container!

TODO


## Prometheus Exporter

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Stellar connector plugin.

### Prometheus Exporter Usage

The prometheus exporter object is initialized in the `PluginLedgerConnectorStellar` class constructor itself, so instantiating the object of the `PluginLedgerConnectorStellar` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginLedgerConnectorStellarOptions` interface for `PluginLedgerConnectorStellar` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total transaction count, which currently increments everytime the `transact()` method of the `PluginLedgerConnectorStellar` class is called.

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

TODO

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments 
