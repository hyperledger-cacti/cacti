# `@hyperledger/cactus-plugin-ledger-connector-iroha2`

This plugin provides `Cactus` a way to interact with **Iroha V2** networks. Using this we can run various Iroha leger instructions and queries.
If you want to connect to Iroha V1 ledger, please use `@hyperledger/cactus-plugin-ledger-connector-iroha` instead.

## Summary

- [Remarks](#remarks)
- [Getting Started](#getting-started)
- [Endpoints](#endpoints)
- [Running the tests](#running-the-tests)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Remarks

- Docker support is not implemented yet.
- There is no official Iroha V2 release yet. API and connector behavior can change before stable release.
- Query pagination is not supported yet. Querying large datasets (the ones with `All`) can be catastrophic. Pagination is not implemented in upstream javascript iroha sdk yet.

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

In the root of the project, execute the command to install and build the dependencies. It will also build this connector:

```sh
yarn run configure
```

### Usage

Import `PluginFactoryLedgerConnector` from the connector package and use it to create a connector.

```typescript
import { PluginFactoryLedgerConnector } from "@hyperledger/cactus-plugin-ledger-connector-iroha2";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";

const defaultConfig = {
  torii: {
    apiURL: "http://127.0.0.1:8080",
  },
  accountId: {
    name: "alice",
    domainId: "wonderland",
  },
};

const factory = new PluginFactoryLedgerConnector({
  pluginImportType: PluginImportType.Local,
});

const connector = await factory.create({
  instanceId: uuidv4(),
  pluginRegistry: new PluginRegistry({ plugins }),
  logLevel,
  defaultConfig,
});
```

Alternatively, you can instantiate a new `PluginLedgerConnectorIroha2` instance directly.

```typescript
import { PluginLedgerConnectorIroha2 } from "@hyperledger/cactus-plugin-ledger-connector-iroha2";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";

const defaultConfig = {
  torii: {
    apiURL: "http://127.0.0.1:8080",
  },
  accountId: {
    name: "alice",
    domainId: "wonderland",
  },
};

const connector = new PluginLedgerConnectorIroha2({
  instanceId: uuidv4(),
  pluginRegistry: new PluginRegistry({ plugins }),
  logLevel,
  defaultConfig,
});
```

> `defaultConfig` in `PluginLedgerConnectorIroha2` options can be used to define a set of configurations common for
> all the requests. Specific, top-level keys of the config can be later overwritten by single requests.
> For example, each request can specify own credentials to be used, but they don't have to define peer address at all since it will
> be taken from the connector default config.

> Connector plugin can export its web endpoints and be called remotely through an `ApiClient`. It is recommended
> to use `ApiServer` for remote connector setup, see `@hyperledger/cactus-cmd-api-server` for more details. The following steps assume
> using the connector directly which is suitable for testing.

You can use the connector plugin to send transactions to or query the Iroha V2 ledger.
Here, for instance, we create and query a new domain:

```typescript
import { IrohaInstruction } from "@hyperledger/cactus-plugin-ledger-connector-iroha2";

const transactionResponse = await connector.transact({
  // Note: `instruction` can be a list of instructions to be sent as single transaction.
  instruction: {
    name: IrohaInstruction.RegisterDomain,
    params: ["newDomainName"],
  },
  baseConfig: {
    // Overwrite default connector config to use own credentials stored in a keychain plugin
    signingCredential: {
      keychainId,
      keychainRef,
    },
  },
});

const queryResponse = await connector.query({
  queryName: IrohaQuery.FindDomainById,
  params: ["newDomainName"],
  baseConfig: {
    signingCredential: {
      keychainId,
      keychainRef,
    },
  },
});
```

> See [connector integration tests](./src/test/typescript/integration) for complete usage examples.

> For the list of currently supported instructions and queries see [Endpoints](#endpoints)

### Building/running the container image locally

- This connector has no image yet.

## Endpoints

### TransactV1 (`/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha2/transact`)

##### RegisterDomain

- `domainName`: string

##### RegisterAssetDefinition

- `assetName`: string,
- `domainName`: string,
- `valueType`: "Fixed" | "Quantity" | "BigQuantity" | "Store",
- `mintable`: "Infinitely" | "Once" | "Not",

##### RegisterAsset

- `assetName`: string,
- `domainName`: string,
- `accountName`: string,
- `accountDomainName`: string,
- `value`: number | bigint | string,

##### MintAsset

- `assetName`: string,
- `domainName`: string,
- `accountName`: string,
- `accountDomainName`: string,
- `value`: number | bigint | string,

##### BurnAsset

- `assetName`: string,
- `domainName`: string,
- `accountName`: string,
- `accountDomainName`: string,
- `value`: number | bigint | string | Metadata,

##### TransferAsset

- `assetName`: string,
- `assetDomainName`: string,
- `sourceAccountName`: string,
- `sourceAccountDomain`: string,
- `targetAccountName`: string,
- `targetAccountDomain`: string,
- `valueToTransfer`: number | bigint | string | Metadata,

##### RegisterAccount

- `accountName`: string,
- `domainName`: string,
- `publicKeyPayload`: string, (hex encoded string)
- `publicKeyDigestFunction` = "ed25519",

### QueryV1 (`/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha2/query`)

#### FindAllDomains

- None

#### FindDomainById

- `domainName`: string

#### FindAssetDefinitionById

- `name`: string,
- `domainName`: string,

#### FindAllAssetsDefinitions

- None

#### FindAssetById

- `assetName`: string,
- `assetDomainName`: string,
- `accountName`: string,
- `accountDomainName`: string,

#### FindAllAssets

- None

#### FindAllPeers

- None

#### FindAllBlocks

- None

#### FindAccountById

- `name`: string,
- `domainName`: string,

#### FindAllAccounts

- None

#### FindAllTransactions

- None

#### FindTransactionByHash

- `hash`: string (hex encoded string)

### WatchBlocksV1 (SocketIO)

#### Subscribe (Input)

- Starts watching for new blocks that will be reported back with `Next` messages.
- Options:
  - `type?: BlockTypeV1`: Specify response block type wanted. Defaults to JSON serialized in string.
  - `startBlock?: string;`: Number of block to start monitoring from.
  - `baseConfig?: Iroha2BaseConfig`: Iroha connection details (merged with default connector config).

#### Unsubscribe (Input)

#### Next (Output)

- Block data encoded as requested in `type` option during subscription.

#### Error (Output)

- Error details.

#### Monitoring new blocks with ApiClient (example)

```typescript
const watchObservable = apiClient.watchBlocksV1({
  type: BlockTypeV1.Raw,
  baseConfig: defaultBaseConfig,
});

const subscription = watchObservable.subscribe({
  next(block) {
    console.log("New block:", block);
  },
  error(err) {
    console.error("Monitor error:", err);
    subscription.unsubscribe();
  },
});
```

## Running the tests

To run all the tests for this connector to ensure it's working correctly execute the following from the root of the `cactus` project:

```sh
npx jest cactus-plugin-ledger-connector-iroha2
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

### Quick connector project walkthrough

#### `./src/main/json/openapi.json`

- Contains OpenAPI definition.

#### `./src/main/typescript/plugin-ledger-connector-iroha2.ts`

- Contains main connector class logic, including `transact` and `query` functions.

#### `./src/main/typescript/utils.ts`

- Utility functions used throughout the connector. If the file grows too big consider dividing it into more subject-related files.
- Should be internal to the connector, not exported in a public interface.

#### `./src/main/typescript/api-client/iroha2-api-client.ts`

- Contains implementation of ApiClient extension over client generated from OpenAPI definition.
- Should be used to connect to remote connector.

#### `./src/main/typescript/web-services`

- Folder that contains web service endpoint definitions.

#### `./src/main/typescript/cactus-iroha-sdk-wrapper/`

- Internal (not exported) wrappers around upstream Iroha javascript SDK.
- Provides convenient functions without need to manually build up message payload.
  - `client.ts` Can be used to add multiple instructions into single transaction and send it. This is base entry for wrapper usage.
  - `query.ts` Contain functions to query the ledger, should be used through client (i.e. `client.query.getSomething()`).
  - `data-factories.ts` Functions that simplify creation of some commonly used structures in the wrapper.

#### `./src/test/typescript/integration/`

- Integration test of various connector functionalities.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
