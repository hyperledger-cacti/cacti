# `@hyperledger/cactus-plugin-ledger-connector-besu`

This plugin provides `Cactus` a way to interact with Besu networks. Using this we can perform:
* Deploy Smart-contracts through bytecode.
* Build and sign transactions using different keystores.
* Invoke smart-contract functions that we have deployed on the network.
## Summary

  - [Getting Started](#getting-started)
  - [Usage](#usage)
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
npm run comfigure
```

### Compiling

In the project root folder, run this command to compile the plugin and create the dist directory:
```sh
npm run tsc
```

## Usage

To use this import public-api and create new **PluginFactoryLedgerConnector**. Then use it to create a connector.
```typescript
const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.LOCAL,
  });
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });
```
You can make calls through the connector to the plugin API:

```typescript
async invokeContract(req: InvokeContractV1Request):Promise<InvokeContractV1Response>;
async transactSigned(rawTransaction: string): Promise<RunTransactionResponse>;
async transactPrivateKey(req: RunTransactionRequest): Promise<RunTransactionResponse>;
async transactCactusKeychainRef(req: RunTransactionRequest):Promise<RunTransactionResponse>;
async deployContract(req: DeployContractSolidityBytecodeV1Request):Promise<RunTransactionResponse>;
async signTransaction(req: SignTransactionRequest):Promise<Optional<SignTransactionResponse>>;
```

Call example to deploy a contract:
```typescript
const deployOut = await connector.deployContract({
  web3SigningCredential: {
    ethAccount: firstHighNetWorthAccount,
    secret: besuKeyPair.privateKey,
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

## Running the tests

To check that all has been installed correctly and that the pugin has no errors run the tests:

* Run this command at the project's root:
```sh
npm run test:plugin-ledger-connector-besu
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments 