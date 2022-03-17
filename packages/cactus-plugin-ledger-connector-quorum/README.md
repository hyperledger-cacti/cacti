# `@hyperledger/cactus-plugin-ledger-connector-quorum`

This plugin provides `Cactus` a way to interact with Quorum networks. Using this we can perform:
* Deploy Smart-contracts through bytecode.
* Build and sign transactions using different keystores.
* Invoke smart-contract functions that we have deployed on the network.

## Summary

  - [Getting Started](#getting-started)
  - [Usage](#usage)
  - [Prometheus Exporter](#prometheus-exporter)
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

To use this import public-api and create new **PluginLedgerConnectorQuorum**.
```typescript
  const connector: PluginLedgerConnectorQuorum = new PluginLedgerConnectorQuorum({
    instanceId: uuidV4(),
    rpcApiHttpHost,
    pluginRegistry: new PluginRegistry(),
  });
```
You can make calls through the connector to the plugin API:

```typescript
async invokeContract(req: InvokeContractJsonObjectV1Request):Promise<InvokeContractV1Response>;
async transact(req: RunTransactionRequest): Promise<RunTransactionResponse>;
async transactSigned(rawTransaction: string): Promise<RunTransactionResponse>;
async transactGethKeychain(txIn: RunTransactionRequest): Promise<RunTransactionResponse>;
async transactPrivateKey(req: RunTransactionRequest): Promise<RunTransactionResponse>;
async transactCactusKeychainRef(req: RunTransactionRequest):Promise<RunTransactionResponse>;
async deployContract(req: DeployContractSolidityBytecodeV1Request :Promise<DeployContractSolidityBytecodeV1Response>;
async deployContractJsonObject(req: DeployContractSolidityBytecodeJsonObjectV1Request): Promise<DeployContractSolidityBytecodeV1Response>
async invokeRawWeb3EthMethod(req: InvokeRawWeb3EthMethodV1Request): Promise<any>;
async invokeRawWeb3EthContract(req: InvokeRawWeb3EthContractV1Request): Promise<any>;
```

Call example to deploy a contract:
```typescript
const deployOut = await connector.deployContract({
  web3SigningCredential: {
    ethAccount: firstHighNetWorthAccount,
    secret: "",
    type: Web3SigningCredentialType.GETHKEYCHAINPASSWORD,
  },
  bytecode: ContractJson.bytecode,
  gas: 1000000,
});
```
The field "type" can have the following values:
```typescript
enum Web3SigningCredentialType {
    CACTUSKEYCHAINREF = 'CACTUS_KEYCHAIN_REF',
    GETHKEYCHAINPASSWORD = 'GETH_KEYCHAIN_PASSWORD',
    PRIVATEKEYHEX = 'PRIVATE_KEY_HEX',
    NONE = 'NONE'
}
```
> Extensive documentation and examples in the [readthedocs](https://readthedocs.org/projects/hyperledger-cactus/) (WIP)

## QuorumApiClient

All connector API endpoints are defined in [open-api specification](./src/main/json/openapi.json). You can use [QuorumApiClient](./src/main/typescript/api-client) to call remote quorum connector functions. It also contain additional utility functions to ease integration.

### REST Functions
See [DefaultApi](./src/main/typescript/generated/openapi/typescript-axios/api.ts) for up-to-date listing of supported endpoints.
- deployContractSolBytecodeJsonObjectV1
- deployContractSolBytecodeV1
- getPrometheusMetricsV1
- invokeContractV1
- invokeContractV1NoKeychain
- invokeRawWeb3EthContractV1
- invokeRawWeb3EthMethodV1
- runTransactionV1

### Asynchronous Functions (socket.io)
- watchBlocksV1

### Send Request Methods
Both methods are deprecated, async version returns immediately while sync respond with Promise of a call results.
- `sendAsyncRequest`
- `sendSyncRequest`

#### Supported Requests
- `web3Eth`: Calls `invokeRawWeb3EthMethodV1`
- `web3EthContract`: Calls  `invokeRawWeb3EthContractV1`

#### Arguments
- The same for both async and sync methods.
- Arguments interpretation depends on `method.type` (i.e. request type)
``` typescript
// Contract definition for web3EthContract request, ignored otherwise
contract: {
  abi?: AbiItem[],
  address?: string
},

// Request definition
method: {
  type: "web3Eth" | "web3EthContract",
  command: string // web3 method
  function?: string; // contract function
  params?: any[]; // contract parameters
}

// web3 method arguments
args: {
  {
    args?: any[] | Record<string, unknown>;
  }
},
```

## Running the tests

To check that all has been installed correctly and that the pugin has no errors, there are two options to run the tests:

* Run this command at the project's root:
```sh
npm run test:plugin-ledger-connector-quorum
```

### Building/running the container image locally

In the Cactus project root say:

```sh
DOCKER_BUILDKIT=1 docker build -f ./packages/cactus-plugin-ledger-connector-quorum/Dockerfile . -t cplcb
```

Build with a specific version of the npm package:
```sh
DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=0.4.1 -f ./packages/cactus-plugin-ledger-connector-quorum/Dockerfile . -t cplcb
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
  --env PLUGINS='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-quorum", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-quorum-connector-instance-id"}}]' \
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
    --plugins='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-quorum", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-quorum-connector-instance-id"}}]'
```

Launch container with **configuration file** mounted from host machine:
```sh

echo '{"authorizationProtocol":"NONE","authorizationConfigJson":{},"plugins":[{"packageName":"@hyperledger/cactus-plugin-ledger-connector-quorum","type":"org.hyperledger.cactus.plugin_import_type.LOCAL","action":"org.hyperledger.cactus.plugin_import_action.INSTALL","options":{"rpcApiHttpHost":"http://localhost:8545","instanceId":"some-unique-quorum-connector-instance-id"}}]}' > cactus.json

docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --mount type=bind,source="$(pwd)"/cactus.json,target=/cactus.json \
  cplcb \
    ./node_modules/@hyperledger/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js \
    --config-file=/cactus.json
```

#### Testing API calls with the container

Don't have a quorum network on hand to test with? Test or develop against our quorum All-In-One container!

**Terminal Window 1 (Ledger)**
```sh
docker run -p 0.0.0.0:8545:8545/tcp  -p 0.0.0.0:8546:8546/tcp  -p 0.0.0.0:8888:8888/tcp  -p 0.0.0.0:9001:9001/tcp  -p 0.0.0.0:9545:9545/tcp hyperledger/cactus-quorum-all-in-one:latest
```

**Terminal Window 2 (Cactus API Server)**
```sh
docker run \
  --network host \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env PLUGINS='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-quorum", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "instanceId": "some-unique-quorum-connector-instance-id"}}]' \
  cplcb
```

**Terminal Window 3 (curl - replace eth accounts as needed)**
```sh
curl --location --request POST 'http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-quorum/run-transaction' \
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

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Quorum connector plugin.

### Prometheus Exporter Usage
The prometheus exporter object is initialized in the `PluginLedgerConnectorQuorum` class constructor itself, so instantiating the object of the `PluginLedgerConnectorQuorum` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginLedgerConnectorQuorumOptions` interface for `PluginLedgerConnectoQuorum` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total transaction count, which currently increments everytime the `transact()` method of the `PluginLedgerConnectorQuorum` class is called.

### Prometheus Integration
To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'quorum_ledger_connector_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-quorum/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-ledger-connector-quorum/src/test/typescript/integration/plugin-ledger-connector-quorum/deploy-contract/deploy-contract-from-json.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-quorum/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_quorum_total_tx_count** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.

## Running the tests

To check that all has been installed correctly and that the pugin has no errors, there are two options to run the tests:

* Run this command at the project's root:
```sh
npm run test:plugin-ledger-connector-quorum
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
```