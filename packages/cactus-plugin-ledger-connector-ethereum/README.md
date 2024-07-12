# `@hyperledger/cactus-plugin-ledger-connector-ethereum`

This plugin provides `Cactus` a way to interact with Ethereum networks. Using this we can perform:

- Deploy Smart-contracts through bytecode.
- Build and sign transactions using different keystores.
- Invoke smart-contract functions that we have deployed on the network.

## Summary

- [Getting Started](#getting-started)
- [Usage](#usage)
- [EthereumApiClient](#ethereumapiclient)
- [Runing the tests](#running-the-tests)
- [Prometheus Exporter](#prometheus-exporter)
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

To use this import public-api and create new **PluginLedgerConnectorEthereum**.

```typescript
const connector: PluginLedgerConnectorEthereum = new PluginLedgerConnectorEthereum(
  {
    instanceId: uuidV4(),
    rpcApiHttpHost,
    pluginRegistry: new PluginRegistry(),
  },
);
```

You can make calls through the connector to the plugin API:

```typescript
async invokeContract(req: InvokeContractJsonObjectV1Request):Promise<InvokeContractV1Response>;
async transact(req: RunTransactionRequest): Promise<RunTransactionResponse>;
async transactSigned(rawTransaction: string): Promise<RunTransactionResponse>;
async transactGethKeychain(txIn: RunTransactionRequest): Promise<RunTransactionResponse>;
async transactPrivateKey(req: RunTransactionRequest): Promise<RunTransactionResponse>;
async transactCactiKeychainRef(req: RunTransactionRequest):Promise<RunTransactionResponse>;
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
  CACTUSKEYCHAINREF = "CACTI_KEYCHAIN_REF",
  GETHKEYCHAINPASSWORD = "GETH_KEYCHAIN_PASSWORD",
  PRIVATEKEYHEX = "PRIVATE_KEY_HEX",
  NONE = "NONE",
}
```

> Extensive documentation and examples in the [readthedocs](https://readthedocs.org/projects/hyperledger-cactus/) (WIP)

## EthereumApiClient

All connector API endpoints are defined in [open-api specification](./src/main/json/openapi.json). You can use [EthereumApiClient](./src/main/typescript/api-client) to call remote ethereum connector functions. It also contain additional utility functions to ease integration.

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
- `web3EthContract`: Calls `invokeRawWeb3EthContractV1`

#### Arguments

- The same for both async and sync methods.
- Arguments interpretation depends on `method.type` (i.e. request type)

```typescript
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

### Offline signing utils
- Use `signTransaction` from this package to sign transactions payload locally (outside of connector process).
- Offline signed transaction can be send with `Web3SigningCredentialType.None` signing credetnial type in runTransactionV1 endpoint.

``` typescript
// Offline sign transaction
const { serializedTransactionHex } = signTransaction(
  {
    to: anotherAccount,
    value: 10e6,
    maxPriorityFeePerGas: 0,
    maxFeePerGas: 0x40000000,
    gasLimit: 21000,
    type: 2
  },
  myPrivateKey,
  {
    networkId: 10,
    chainId: 10,
    defaultHardfork: "london",
  },
);

// Send transaction payload to connector
await apiClient.runTransactionV1({
  web3SigningCredential: {
    type: Web3SigningCredentialType.None,
  },
  transactionConfig: {
    rawTransaction: serializedTransactionHex,
  },
});
```

### watchBlocksV1
- ApiClient can be used to monitor for new blocks from the ledger with `watchBlocksV1` method.
- When etherum node supports subscription (e.g. websocket protocol is used), then blocks connector will subscribe to new block header event (recommended).
- If ethereum node supports HTTP access only, then polling method will be used.

#### Example

``` typescript
const watchObservable = apiClient.watchBlocksV1({
  getBlockData, // true - return transactions, false - return header only (default)
  lastSeenBlock, // connector will push all blocks since lastSeenBlock (default - latest)
  httpPollInterval // how often to poll the node (only for http-polling method)
});

const subscription = watchObservable.subscribe({
  next(event) {
    // process block data
  },
  error(err) {
    // handle error
    subscription.unsubscribe();
  },
});
```

## JSON-RPC Proxy
- Connector can be used with web3js to send any JSON-RPC request to the ethereum node.

### Example
``` typescript
  const proxyUrl = new URL(
    "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/json-rpc",
    apiHost,
  );
  const web3ProxyClient = new Web3(proxyUrl.toString());
  const gasPrice = await web3ProxyClient.eth.getGasPrice();
```

## Running the tests

To check that all has been installed correctly and that the pugin has no errors run jest test suites.

- Run this command at the project's root:

```sh
npx jest cactus-plugin-ledger-connector-ethereum
```

### Stess test
- Use CLI for manual setup of test environment and geneartion of artillery config.
- `artillery` must be installed separately (we do not recommend running it if they are any known open vulnerabilities)

#### Setup

``` sh
# Start the test environment
node ./packages/cactus-plugin-ledger-connector-ethereum/dist/lib/test/typescript/benchmark/cli/run-benchmark-environment.js
# Wait until `> artillery run ./.manual-geth-artillery-config.yaml` is printed

# Review artillery config - change scenarios weights or load configuration, adjust target if running on separate machine etc...
vim ./.manual-geth-artillery-config.yaml # config is created in cwd() when starting the environment

# Run artillery
artillery run ./.manual-geth-artillery-config.yaml
```

#### Files
- `./src/test/typescript/benchmark/setup`
  - `geth-benchmark-env.ts` contains helper file for setting up an environment used by both CLI and jest test.
  - `geth-benchmark-config.yaml` template artillery configuration. You can modify test load and scenarios there.
  - `artillery-helper-functions.js` request handlers used by artillery to correcty process some response codes.
- `./src/test/typescript/benchmark/cli`
  - `run-benchmark-environment.ts` CLI for starting test environment and patching template artillery config


#### Running the container

Launch container with plugin configuration as an **environment variable**:
```sh
docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env AUTHORIZATION_PROTOCOL='NONE' \
  --env AUTHORIZATION_CONFIG_JSON='{}' \
  --env GRPC_TLS_ENABLED=false \
  --env API_TLS_CERT_PEM=- \
  --env API_TLS_CLIENT_CA_PEM=- \
  --env API_TLS_KEY_PEM=- \
  --env API_TLS_ENABLED=false \
  --env API_MTLS_ENABLED=false \
  --env API_HOST=0.0.0.0 \
  --env LOG_LEVEL=INFO \
  ghcr.io/hyperledger/cactus-cmd-api-server:2024-07-03t18-38-45-dev-65adc3255 \
  node index.js \
  --plugins='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-ethereum", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "rpcApiWsHost":"ws://localhost:8546", "instanceId": "some-unique-ethereum-connector-instance-id"}}]'
```

Launch container with plugin configuration as a **CLI argument**:
```sh
docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env AUTHORIZATION_PROTOCOL='NONE' \
  --env AUTHORIZATION_CONFIG_JSON='{}' \
  --env GRPC_TLS_ENABLED=false \
  --env API_TLS_CERT_PEM=- \
  --env API_TLS_CLIENT_CA_PEM=- \
  --env API_TLS_KEY_PEM=- \
  --env API_TLS_ENABLED=false \
  --env API_MTLS_ENABLED=false \
  --env API_HOST=0.0.0.0 \
  --env LOG_LEVEL=INFO \
  ghcr.io/hyperledger/cactus-cmd-api-server:2024-07-03t18-38-45-dev-65adc3255 \
  node index.js \
    --plugins='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-ethereum", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://localhost:8545", "rpcApiWsHost":"ws://localhost:8546", "instanceId": "some-unique-ethereum-connector-instance-id"}}]'
```

Launch container with **configuration file** mounted from host machine:
```sh
echo '{"plugins": [{"packageName": "@hyperledger/cactus-plugin-ledger-connector-ethereum", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://127.0.0.1:8545", "rpcApiWsHost":"ws://127.0.0.1:8546", "instanceId": "some-unique-ethereum-connector-instance-id"}}]}' > .cacti-config.json
```

```sh
docker run \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env AUTHORIZATION_PROTOCOL='NONE' \
  --env AUTHORIZATION_CONFIG_JSON='{}' \
  --env GRPC_TLS_ENABLED=false \
  --env API_TLS_CERT_PEM=- \
  --env API_TLS_CLIENT_CA_PEM=- \
  --env API_TLS_KEY_PEM=- \
  --env API_TLS_ENABLED=false \
  --env API_MTLS_ENABLED=false \
  --env API_HOST=0.0.0.0 \
  --env LOG_LEVEL=INFO \
  --mount type=bind,source="$(pwd)"/.cacti-config.json,target=/.cacti-config.json \
  ghcr.io/hyperledger/cactus-cmd-api-server:2024-07-03t18-38-45-dev-65adc3255 \
    node index.js \
    --config-file=/.cacti-config.json
```

#### Testing API calls with the container

Don't have a Ethereum network on hand to test with? Test or develop against our Besu All-In-One container!

**Terminal Window 1 (Ledger)**
```sh
docker run \
  --publish 0.0.0.0:8545:8545/tcp \
  --publish 0.0.0.0:8546:8546/tcp \
  --publish 0.0.0.0:8888:8888/tcp \
  --publish 0.0.0.0:9001:9001/tcp \
  --publish 0.0.0.0:9545:9545/tcp \
  ghcr.io/hyperledger/cactus-besu-all-in-one:2024-07-04-8c030ae
```

**Terminal Window 2 (Cacti API Server)**
```sh
docker run \
  --network=host \
  --rm \
  --publish 3000:3000 \
  --publish 4000:4000 \
  --env AUTHORIZATION_PROTOCOL='NONE' \
  --env AUTHORIZATION_CONFIG_JSON='{}' \
  --env GRPC_TLS_ENABLED=false \
  --env API_TLS_CERT_PEM=- \
  --env API_TLS_CLIENT_CA_PEM=- \
  --env API_TLS_KEY_PEM=- \
  --env API_TLS_ENABLED=false \
  --env API_MTLS_ENABLED=false \
  --env API_HOST=0.0.0.0 \
  --env LOG_LEVEL=INFO \
  ghcr.io/hyperledger/cactus-cmd-api-server:2024-07-03t18-38-45-dev-65adc3255 \
  node index.js \
  --plugins='[{"packageName": "@hyperledger/cactus-plugin-ledger-connector-ethereum", "type": "org.hyperledger.cactus.plugin_import_type.LOCAL", "action": "org.hyperledger.cactus.plugin_import_action.INSTALL",  "options": {"rpcApiHttpHost": "http://127.0.0.1:8545", "rpcApiWsHost":"ws://127.0.0.1:8546", "instanceId": "some-unique-besu-connector-instance-id"}}]'
```

**Terminal Window 3 (curl - replace eth accounts as needed)**
```sh
curl --location --request POST 'http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/run-transaction' \
--header 'Content-Type: application/json' \
--data-raw '{
    "web3SigningCredential": {
      "ethAccount": "627306090abaB3A6e1400e9345bC60c78a8BEf57",
      "secret": "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
      "type": "PRIVATE_KEY_HEX"
    },
    "transactionConfig": {
      "from": "627306090abaB3A6e1400e9345bC60c78a8BEf57",
      "to": "f17f52151EbEF6C7334FAD080c5704D77216b732",
      "value": "1",
      "maxPriorityFeePerGas": "0",
      "maxFeePerGas": "40000000",
      "gasLimit": "21000",
      "type": 2
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

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Ethereum connector plugin.

### Prometheus Exporter Usage

The prometheus exporter object is initialized in the `PluginLedgerConnectorEthereum` class constructor itself, so instantiating the object of the `PluginLedgerConnectorEthereum` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginLedgerConnectorEthereumOptions` interface for `PluginLedgerConnectoEthereum` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total transaction count, which currently increments everytime the `transact()` method of the `PluginLedgerConnectorEthereum` class is called.

### Prometheus Integration

To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'ethereum_ledger_connector_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-ledger-connector-ethereum/src/test/typescript/integration/plugin-ledger-connector-ethereum/deploy-contract/deploy-contract-from-json.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_ethereum_total_tx_count** and click **execute**

### Manual Alchemy integration test

There's a simple script for checking integration with [alchemy platform](https://www.alchemy.com/) in `./src/test/typescript/manual/geth-alchemy-integration-manual-check.test.ts`. To run it follow these steps:

- Sign up on Alchemy platform.
- Prepare your wallet address and private key.
- Use free Sepolia faucet to get some test ether: https://sepoliafaucet.com/
  - note: script assumes Sepolia testnet but it should work with any other testnets from alchemy, you just need to adjust the script accordingly.
- `Create App` on Alchemy dashboard.
  - Use any name and description.
  - Select `Chain: Ethereum`
  - Select `Network: Ethereum Sepolia`
- Click `View Key` (on the dashboard) next to the newly created App.
- Copy HTTPS RPC endpoint to `ALCHEMY_ENDPOINT` variable near top of `geth-invoke-web3-contract-v1.test.ts` file (or just replace **\_\_**API_KEY**\_\_** with your API key).
  - note: if you misspell it you'll get authentication errors.
- Copy your account address to `ETH_ADDRESS` variable.
- Copy your private key to `ETH_PRIVATE_KEY` variable.
- **Build the project, or at least this package (`npx tsc`). Remember to run the build after each change in script - it will not happen automatically!**
- Execute inside this package directory:
  - `npx jest dist/lib/test/typescript/manual/geth-alchemy-integration-manual-check.test.js`

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments

```

```
