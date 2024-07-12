# `@hyperledger/cactus-plugin-persistence-fabric`

This plugin allows `Cacti` to persist Fabric Block general data and basic information about transactions into some storage (currently to a `PostgreSQL` database, but this concept can be extended further).
Data in the database can later be analyzed and viewed in a GUI tool.
GUI tool is in project root directory of Cacti project in GUI folder. cacti/packages/cacti-ledger-browser


## Summary

- [Remarks](#remarks)
- [Getting Started](#getting-started)
- [Endpoints](#endpoints)
- [Running the tests](#running-the-tests)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Remarks

- This plugin was only tested with small test ledgers. Running it to synchronize with old ledgers will take a lot of time.
- For now, the database schema is not considered public and can change over time (i.e., writing own application that reads data directly from the database is discouraged).
- All the methods must be called directly on the plugin instance for now.

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

In the root of the project, execute the command to install and build the dependencies. It will also build this persistence plugin:

```sh
yarn run configure
```

### Usage

Instantiate a new `PluginPersistenceFabrickBlock` instance:

```typescript
import { PluginPersistenceFabric } from "../../../main/typescript/plugin-fabric-persistence-block";
import { v4 as uuidv4 } from "uuid";

PluginInstance = new PluginPersistenceFabric({
  gatewayOptions,
  apiClient,
  logLevel: testLogLevel,
  instanceId: uuidv4(),
  connectionString:
    "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres",
});

// Initialize the connection to the DB
PluginInstance.onPluginInit();
```

Alternatively, import `PluginPersistenceFabric` from the plugin package and use it to create a plugin.

```typescript
import { PluginPersistenceFabric } from "@hyperledger/plugin-fabric-persistence-block";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { v4 as uuidv4 } from "uuid";

const factory = new PluginFactoryPersistenceFabricBlock({
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
persistencePlugin.onPluginInit();
```

onPluginInit it also creates database structure if this is first time run

// Start synchronization with ledger.
// To synchronize ledger

you individually

// Show current status of the plugin
PluginInstance.getStatus();

```


```

## Endpoints

### Plugin Methods

- Most of the plugin functionalities are currently not available through OpenAPI interface, please use direct method calls instead.

#### `onPluginInit`

- Should be called before using the plugin.

#### `shutdown`

- Close the connection to the DB, cleanup any allocated resources.

#### `getStatus`

- Get status report of this instance of persistence plugin.

#### `constinousBlocksSynchronization`

- Start the block synchronization process. New blocks from the ledger will be parsed and pushed to the database.

#### `continueBlocksSynchronization`

- Start the block synchronization process. New blocks from the ledger will be parsed and pushed to the database. Should be used periodically.

#### `changeSynchronization`

- Stop the block synchronization process.

#### `whichBlocksAreMissingInDdSimple`

- Walk through all the blocks that could not be synchronized with the DB for some reasons and list them

#### `synchronizeOnlyMissedBlocks`

- Walk through all the blocks that are listed as not be synchronized with the DB for some reasons and try push them into DB from ledger.
- can try many times to use this

### `setLastBlockConsidered`

- set the last block in ledger which we consider valid by our party and synchronize only to this point in ledger
  If some blocks above this number are already in database they will not be removed.

#### `initialBlocksSynchronization`

- Synchronize entire first N number of blocks of ledger state with the database. It is a good start and easy to check if everything is correctly set.

## Running the tests

To run all the tests for this persistence fabric plugin to ensure it's working correctly execute the following from the root of the `cactus` project:

```sh
npx jest cactus-plugin-fabric-persistence-block
```

## Contributing

We welcome contributions to Hyperledger Cacti in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

### Quick plugin project walkthrough

#### ./src/main/json/contract_abi

- Contains reference token ABIs used to call and identify token transfers.

#### `./src/main/json/openapi.json`

- Contains OpenAPI definition.

#### `./src/main/sql/schema.sql`

- Database schema for Ethereum data.

#### `./src/main/typescript/web-services`

- Folder that contains web service endpoint definitions if present.

#### `./plugin-fabric-persistence-block`

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
