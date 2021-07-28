# `@hyperledger/cactus-plugin-ledger-connector-iroha`

This plugin provides `Cactus` a way to interact with Iroha networks. Using this we can perform:
* Run various Iroha leger commands and queries.
* Build and sign transactions using different credentials.
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
yarn run configure
```

### Compiling

In the project root folder, run this command to compile the plugin and create the dist directory:
```sh
npm run tsc
```

### Architecture
The sequence diagrams for various endpoints are mentioned below

#### run-transaction-endpoint
![run-transaction-endpoint sequence diagram](docs/architecture/images/run-transaction-endpoint.png)
The above diagram shows the sequence diagram of run-transaction-endpoint. User A (One of the many Users) interacts with the API Client which in turn, calls the API server. API server then executes transact() method which is explained in detailed in the subsequent diagrams.
![run-transaction-endpoint transact() method](docs/architecture/images/run-transaction-endpoint-transact.png)
The above diagram shows the sequence diagraom of transact() method of the PluginLedgerConnectorIroha class. The caller to this function, which in reference to the above sequence diagram is API server, sends RunTransactionRequest object as an argument to the transact() method. Based on the type of Web3SigningCredentialType, corresponsing responses are sent back to the caller.  

### Usage

To use this import public-api and create new **PluginFactoryLedgerConnector**. Then use it to create a connector.
```typescript
const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.LOCAL,
  });
  const connector: PluginLedgerConnectorIroha = await factory.create({
    rpcApiHttpHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });
```
You can make calls through the connector to the plugin API:

```typescript
async transact(req: RunTransactionRequest):Promise<RunTransactionResponse>;
```

Call example to run an Iroha command:
```typescript
    const req = {
      commandName: "createAccount",
      params: [
        "user1",
        "test",
        "fe31d7bc2dbe695b1cd5c706dde902d5fb6e6ce4b60e08418c842fdef5805230",
      ],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
```
Call example to run an Iroha query:
```typescript
    const req = {
      commandName: "getAccount",
      params: ["admin@test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
```
> Extensive documentation and examples in the [readthedocs](https://readthedocs.org/projects/hyperledger-cactus/) (WIP) 


### Building/running the container image locally

In the Cactus project root say:

```sh
DOCKER_BUILDKIT=1 docker build -f ./packages/cactus-plugin-ledger-connector-iroha/Dockerfile . -t cplcb
```

Build with a specific version of the npm package:
```sh
DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=0.4.1 -f ./packages/cactus-plugin-ledger-connector-iroha/Dockerfile . -t cplcb
```

#### Running the container

Launch container with plugin configuration as an **environment variable**:
```sh
docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env PLUGINS='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-iroha", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-iroha-connector-instance-id"}}]' \
  cplcb
```

Launch container with plugin configuration as a **CLI argument**:
```sh
docker run \
  --rm \
  --publish 3000:3000 \
   --publish 4000:4000 \
  cplcb \
    ./node_modules/.bin/cactusapi \
    --plugins='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-iroha", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-iroha-connector-instance-id"}}]'
```

Launch container with **configuration file** mounted from host machine:
```sh

echo '[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-iroha", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-iroha-connector-instance-id"}}]' > cactus.json

docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --mount type=bind,source="$(pwd)"/cactus.json,target=/cactus.json \
  cplcb \
    ./node_modules/.bin/cactusapi \
    --config-file=/cactus.json
```

#### Testing API calls with the container

Don't have an Iroha network on hand to test with? Test or develop against our Iroha All-In-One dockerfile!

**Terminal Window 1 (Ledger)**
```sh
docker run -p 0.0.0.0:8545:8545/tcp  -p 0.0.0.0:8546:8546/tcp  -p 0.0.0.0:8888:8888/tcp  -p 0.0.0.0:9001:9001/tcp  -p 0.0.0.0:9545:9545/tcp hyperledger/cactus-iroha-all-in-one:latest
```

**Terminal Window 2 (Cactus API Server)**
```sh
docker run \
  --network host \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env PLUGINS='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-iroha", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-iroha-connector-instance-id"}}]' \
  cplcb
```

**Terminal Window 3 (curl - replace eth accounts as needed)**
```sh
curl --location --request POST 'http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha/run-transaction' \
--header 'Content-Type: application/json' \
--data-raw '{
    "web3SigningCredential": {
      "ethAccount": "627306090abaB3A6e1400e9345bC60c78a8BEf57",
      "secret": "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
      "type": "PRIVATE_KEY_HEX"
    },
    "consistencyStrategy": {
      "blockConfirmations": 0,
      "receiptType": "NODE_TX_POOL_ACK"
    },
    "transactionConfig": {
      "from": "627306090abaB3A6e1400e9345bC60c78a8BEf57",
      "to": "f17f52151EbEF6C7334FAD080c5704D77216b732",
      "value": 1,
      "gas": 10000000
    }
}'
```

The above should produce a response that looks similar to this:

```json
{
    "success": true,
    "data": {
        "transactionReceipt": {
            "blockHash": "0x7c97c038a5d3bd84613fe23ed442695276d5d2df97f4e7c4f10ca06765033ffd",
            "blockNumber": 1218,
            "contractAddress": null,
            "cumulativeGasUsed": 21000,
            "from": "0x627306090abab3a6e1400e9345bc60c78a8bef57",
            "gasUsed": 21000,
            "logs": [],
            "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "status": true,
            "to": "0xf17f52151ebef6c7334fad080c5704d77216b732",
            "transactionHash": "0xc7fcb46c735bdc696d500bfc70c72595a2b8c31813929e5c61d9a5aec3376d6f",
            "transactionIndex": 0
        }
    }
}
```

## Prometheus Exporter

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Iroha connector plugin.

### Prometheus Exporter Usage
The prometheus exporter object is initialized in the `PluginLedgerConnectorIroha` class constructor itself, so instantiating the object of the `PluginLedgerConnectorIroha` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginLedgerConnectorIrohaOptions` interface for `PluginLedgerConnectoIroha` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total transaction count, which currently increments everytime the `transact()` method of the `PluginLedgerConnectorIroha` class is called.

### Prometheus Integration
To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'iroha_ledger_connector_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-ledger-connector-iroha/src/test/typescript/integration/plugin-ledger-connector-iroha/deploy-contract/deploy-contract-from-json.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_iroha_total_tx_count** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.

## Running the tests

To check that all has been installed correctly and that the pugin has no errors run the tests:

* Run this command at the project's root:
```sh
yarn run test:plugin-ledger-connector-iroha
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments 
