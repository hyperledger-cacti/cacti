# `@hyperledger/cactus-plugin-ledger-connector-xdai`

This plugin provides `Cactus` a way to interact with Xdai networks. Using this we can perform:
* Deploy Smart-contracts through bytecode.
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
npm run configure
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
The above diagram shows the sequence diagraom of transact() method of the PluginLedgerConnectorXdai class. The caller to this function, which in reference to the above sequence diagram is API server, sends RunTransactionV1Request object as an argument to the transact() method. Based on the type of Web3SigningCredentialType, corresponsing responses are sent back to the caller.  
![run-transaction-endpoint transactCactusKeychainRef() method](docs/architecture/images/run-transaction-endpoint-transact-cactuskeychainref.png)
The above diagram shows transactCactusKeychainReference() method being called by the transact() method of the PluginLedgerConnector class when the Web3SigningCredentialType is CACTUSKEYCHAINREF. This method inturn calls transactPrivateKey() which calls the signTransaction() method of web3 library. 
![runtransaction-endpoint transactPrivateKey() method](docs/architecture/images/run-transaction-endpoint-transact-privatekey.png)
The above diagram shows transactPrivateKey() method being called by the transact() method of the PluginLedgerConnector class when the Web3SigningCredentialType is PRIVATEKEYHEX. This method then calls the signTransaction() method of the web3 library.
![run-transaction-endpoint transactSigned() method](docs/architecture/images/run-transaction-endpoint-transact-signed.png)
The above diagram shows transactSigned() method being called by the transact() method of the PluginLedgerConnector class when the Web3SigningCredentialType is NONE. This method calls the sendSignedTransaction() of the web3 library and then calls pollForTxReceipt() method.
![run-transaction-endpoint pollForTxReceipt() method](docs/architecture/images/run-transaction-endpoint-transact-pollfortxreceipt.png)
The above diagram shows pollForTxReceipt() method which is called by the transactSigned() method as described in the previous sequence diagram. This method waits for the block confirmation in a loop and then sends the corresponding response back to the caller.

### Usage

To use this import public-api and create new **PluginFactoryLedgerConnector**. Then use it to create a connector.
```typescript
const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.LOCAL,
  });
  const connector: PluginLedgerConnectorXdai = await factory.create({
    rpcApiHttpHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });
```
You can make calls through the connector to the plugin API:

```typescript
async invokeContract(req: InvokeContractV1Request):Promise<InvokeContractV1Response>;
async transactSigned(rawTransaction: string): Promise<RunTransactionV1Response>;
async transactPrivateKey(req: RunTransactionV1Request): Promise<RunTransactionV1Response>;
async transactCactusKeychainRef(req: RunTransactionV1Request):Promise<RunTransactionV1Response>;
async deployContract(req: DeployContractV1Request):Promise<RunTransactionV1Response>;
async signTransaction(req: SignTransactionRequest):Promise<Optional<SignTransactionResponse>>;
```

Call example to deploy a contract:
```typescript
const deployOut = await connector.deployContract({
  web3SigningCredential: {
    ethAccount: firstHighNetWorthAccount,
    secret: xdaiKeyPair.privateKey,
    type: Web3SigningCredentialType.PRIVATEKEYHEX,
  },
  bytecode: SmartContractJson.bytecode,
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

## Prometheus Exporter

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Xdai connector plugin.

### Prometheus Exporter Usage
The prometheus exporter object is initialized in the `PluginLedgerConnectorXdai` class constructor itself, so instantiating the object of the `PluginLedgerConnectorXdai` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginLedgerConnectorXdaiOptions` interface for `PluginLedgerConnectoXdai` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total transaction count, which currently increments everytime the `transact()` method of the `PluginLedgerConnectorXdai` class is called.

### Prometheus Integration
To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'xdai_ledger_connector_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-xdai/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-ledger-connector-xdai/src/test/typescript/integration/plugin-ledger-connector-xdai/deploy-contract/deploy-contract-from-json.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-xdai/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_xdai_total_tx_count** and click **execute**

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
npm run test:plugin-ledger-connector-xdai
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments 
