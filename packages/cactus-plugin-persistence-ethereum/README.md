# `@hyperledger/cactus-plugin-persistence-ethereum`

This plugin allows `Cactus` to persist Ethereum data into some storage (currently to a `PostgreSQL` database, but this concept can be extended further).
Data in the database can later be analyzed and viewed in a GUI tool.

## Summary

- [Remarks](#remarks)
- [Getting Started](#getting-started)
- [Endpoints](#endpoints)
- [Running the tests](#running-the-tests)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Remarks

- This plugin was only tested with small, permissioned Ethereum ledgers. Running it to archive and monitor large ledgers (like main net) is not recommended yet.
- For now, the database schema is not considered public and can change over time (i.e., writing own application that reads data directly from the database is discouraged).
- Only `status` endpoint is available, all the methods must be called directly on the plugin instance for now.
- Monitored ERC20 tokens should be added before synchronizing the database (previous transfers will not be parsed correctly if you later add the token).

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

In the root of the project, execute the command to install and build the dependencies. It will also build this persistence plugin:

```sh
yarn run configure
```

### Usage

Instantiate a new `PluginPersistenceEthereum` instance:

```typescript
import { PluginPersistenceEthereum } from "@hyperledger/cactus-plugin-persistence-ethereum";
import { v4 as uuidv4 } from "uuid";

const persistencePlugin = new PluginPersistenceEthereum({
  instanceId: uuidv4(),
  apiClient: new SocketIOApiClient(apiConfigOptions),
  logLevel: "info",
  connectionString:
    "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres",
});

// Initialize the connection to the DB
await persistencePlugin.onPluginInit();
```

Alternatively, import `PluginFactoryLedgerPersistence` from the plugin package and use it to create a plugin.

```typescript
import { PluginFactoryLedgerPersistence } from "@hyperledger/cactus-plugin-persistence-ethereum";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { v4 as uuidv4 } from "uuid";

const factory = new PluginFactoryLedgerPersistence({
  pluginImportType: PluginImportType.Local,
});

const persistencePlugin = await factory.create({
  instanceId: uuidv4(),
  apiClient: new SocketIOApiClient(apiConfigOptions),
  logLevel: "info",
  connectionString:
    "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres",
});

// Initialize the connection to the DB
await persistencePlugin.onPluginInit();
```

You can use the persistent plugin to start monitoring token balance changes and synchronize ledger state with the database.
Here is a sample script that adds two tokens to monitor, synchronizes all currently issued ERC721 tokens and starts monitoring for new blocks:

```typescript
// Add ERC20 token under address erc20ContractAddress, monitor all transfers.
await persistencePlugin.addTokenERC20(erc20ContractAddress);

// Add ERC721 token as well to monitor transfers
await persistencePlugin.addTokenERC721(erc721ContractAddress);

// Synchronize all issued ERC721 token balances that we currently monitor
await persistencePlugin.syncERC721Tokens();

// Start monitoring new blocks.
// Transactions in each block are parsed, token transfers update current token balances.
// Entire ledger is synchronized first with the DB (`syncAll` is called) so this operation can take a while on large ledgers!
persistencePlugin.startMonitor((err) => {
  reject(err);
});

// Show current status of the plugin
persistencePlugin.getStatus();
```

> See [plugin integration tests](./src/test/typescript/integration) for complete usage examples.

### Building/running the container image locally

In the Cactus project root say:

```sh
DOCKER_BUILDKIT=1 docker build ./packages/cactus-plugin-persistence-ethereum/ -f ./packages/cactus-plugin-persistence-ethereum/Dockerfile -t cactus-plugin-persistence-ethereum
```

## Endpoints

### StatusV1 (`/api/v1/plugins/@hyperledger/cactus-plugin-persistence-ethereum/status`)

- Returns status of the plugin (latest block read, failed blocks, is monitor running, etc...)

### Plugin Methods

- Most of the plugin functionalities are currently not available through OpenAPI interface, please use direct method calls instead.

#### `onPluginInit`

- Should be called before using the plugin.

#### `shutdown`

- Close the connection to the DB, cleanup any allocated resources.

#### `getStatus`

- Get status report of this instance of persistence plugin.

#### `refreshMonitoredTokens`

- Fetch the metadata of all tokens to be monitored by this persistence plugin.

#### `syncERC721Tokens`

- Synchronize issued tokens for all ERC721 token contract monitored by this persistence plugin.

#### `startMonitor`

- Start the block monitoring process. New blocks from the ledger will be parsed and pushed to the database.

#### `stopMonitor`

- Stop the block monitoring process.

#### `addTokenERC20`

- Add new ERC20 token to be monitored by this plugin.

#### `addTokenERC721`

- Add new ERC721 token to be monitored by this plugin.

#### `syncFailedBlocks`

- Walk through all the blocks that could not be synchronized with the DB for some reasons and try pushing them again.

#### `syncAll`

- Synchronize entire ledger state with the database.

## Running the tests

To run all the tests for this persistence plugin to ensure it's working correctly execute the following from the root of the `cactus` project:

```sh
npx jest cactus-plugin-persistence-ethereum
```

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

### Quick plugin project walkthrough

#### ./src/main/json/contract_abi

- Contains reference token ABIs used to call and identify token transfers.

#### `./src/main/json/openapi.json`

- Contains OpenAPI definition.

#### `./src/main/sql/schema.sql`

- Database schema for Ethereum data.

#### `./src/main/typescript/token-client`

- Client used to execute methods on token contracts.

#### `./src/main/typescript/web-services`

- Folder that contains web service endpoint definitions.

#### `./plugin-persistence-ethereum`

- Main persistent plugin logic file

#### `./src/test/typescript/integration/`

- Integration test of various plugin functionalities.

### Generating types from the database schema

- Current setup assume use of Supabase that has utility for generating types from the database schema.
- We use this tool to generate type definitions and store them in `./src/main/typescript/db-client/database.types.ts`
- Upstream instructions: https://supabase.com/docs/guides/api/generating-types
- Step by step manual on updating the types (must be done after changing the database schema):
  - Install `supabase` package
  - Init and start development supabase server:
    - `npx supabase init`
    - `npx supabase start`
  - Fill in current schema:
    - `psql -h localhost -p 54322 -U postgres -d postgres -a -f src/main/sql/schema.sql` (password: `postgres`)
  - Generate the file with type definitions:
    - `npx supabase gen types typescript --schema public --local > src/main/typescript/db-client/database.types.ts`
  - Cleanup:
    - `npx supabase stop`
    - `rm -rf ./supabase`

#### Insert sample data

- Can be used to test GUI applications without running entire ledger / persistence setup.
- `psql -h localhost -p 54322 -U postgres -d postgres -a -f src/test/sql/insert-test-data.sql` (password: `postgres`)

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
