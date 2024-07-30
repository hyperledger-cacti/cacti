# `@hyperledger/cactus-plugin-persistence-fabric`

This plugin allows `Cacti` to persist Hyperledger Fabric data into some storage (currently to a `PostgreSQL` database, but this concept can be extended further).
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

- This plugin was only tested with small Fabric ledgers. Running it to archive and monitor large ledgers is not recommended yet.
- For now, the database schema is not considered public and can change over time (i.e., writing own application that reads data directly from the database is discouraged).
- Only `status` endpoint is available, all the methods must be called directly on the plugin instance for now.

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

#### Build

In the root of the project, execute the command to install and build the dependencies. It will also build this persistence plugin:

```sh
yarn run configure
```

#### Hyperledger Fabric Ledger and Connector

This plugin requires a running Hyperledger Fabric ledger that you want to persist to a database. For testing purposes, you can use our [test fabric-all-in-one Docker image](../../tools/docker/fabric-all-in-one/README.md). To access the ledger you'll need your organization connection profile JSON and a wallet containing registered identity. If you are using our `fabric-all-in-one` image, you can run our [asset-transfer-basic-utils scripts](../../tools/docker/fabric-all-in-one/asset-transfer-basic-utils/README.md) to fetch Org1 connection profile from a docker and register new user to a localhost wallet.

```shell
# Start the test ledger
docker compose -f tools/docker/fabric-all-in-one/docker-compose-v2.x.yml up
# Wait for it to start (status should become `healthy`)

# Run asset-transfer-basic-utils scripts
cd tools/docker/fabric-all-in-one/asset-transfer-basic-utils
# Cleanup artifacts from previous runs
rm -fr wallet/ connection.json
# Fetch connection profile to `tools/docker/fabric-all-in-one/asset-transfer-basic-utils/connection.json`
# Enroll user using wallet under `tools/docker/fabric-all-in-one/asset-transfer-basic-utils/wallet`
npm install
CACTUS_FABRIC_ALL_IN_ONE_CONTAINER_NAME=fabric_all_in_one_testnet_2x  ./setup.sh
```

Once you have an Fabric ledger ready, you need to start the [Ethereum Cacti Connector](../cactus-plugin-ledger-connector-fabric/README.md). We recommend running the connector on the same ApiServer instance as the persistence plugin for better performance and reduced network overhead. See the connector package README for more instructions, or check out the [setup sample scripts](./src/test/typescript/manual).

#### Supabase Instance

You need a running Supabase instance to serve as a database backend for this plugin.

### Setup Tutorials

We've created some sample scripts to help you get started quickly. All the steps have detailed comments on it so you can quickly understand the code.

#### Sample Setup

Location: [./src/test/typescript/manual/sample-setup.ts](./src/test/typescript/manual/sample-setup.ts)

This sample script can be used to set up `ApiServer` with the Fabric connector and persistence plugins to monitor and store ledger data in a database. You need to have a ledger running before executing this script.

To run the script you need to set the following environment variables:

- `FABRIC_CONNECTION_PROFILE_PATH`: Full path to fabric ledger connection profile JSON file.
- `FABRIC_CHANNEL_NAME`: Name of the channel we want to connect to (to store it's data).
- `FABRIC_WALLET_PATH` : Full path to wallet containing our identity (that can connect and observe specified channel).
- `FABRIC_WALLET_LABEL`: Name (label) of our identity in a wallet provided in FABRIC_WALLET_PATH

By default, the script will try to use our `supabase-all-in-one` instance running on localhost. This can be adjusted by setting PostgreSQL connection string in `SUPABASE_CONNECTION_STRING` environment variable (optional).

```shell
# Example assumes fabric-all-in-one was used. Adjust the variables accordingly.
FABRIC_CONNECTION_PROFILE_PATH=/home/cactus/tools/docker/fabric-all-in-one/asset-transfer-basic-utils/connection.json FABRIC_CHANNEL_NAME=mychannel FABRIC_WALLET_PATH=/home/cactus/tools/docker/fabric-all-in-one/asset-transfer-basic-utils/wallet FABRIC_WALLET_LABEL=appUser
node ./dist/lib/test/typescript/manual/sample-setup.js
```

#### Complete Sample Scenario

Location: [./src/test/typescript/manual/common-setup-methods](./src/test/typescript/manual/common-setup-methods)

This script starts the test Hyperledger Fabric ledger for you and executes few transactions on a `basic` chaincode. Then, it synchronizes everything to a database and monitors for all new blocks. This script can also be used for manual, end-to-end tests of a plugin.

By default, the script will try to use our `supabase-all-in-one` instance running on localhost.

```shell
npm run complete-sample-scenario
```

Custom supabase can be set with environment variable `SUPABASE_CONNECTION_STRING`:

```shell
SUPABASE_CONNECTION_STRING=postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres npm run complete-sample-scenario
```

### Usage

Instantiate a new `PluginPersistenceFabric` instance:

```typescript
import { PluginPersistenceFabric } from "@hyperledger/cactus-plugin-persistence-fabric";
import { v4 as uuidv4 } from "uuid";

const persistencePlugin = new PluginPersistenceFabric({
  apiClient: new FabricApiClient(apiConfigOptions),
  logLevel: "info",
  instanceId: "my-instance",
  connectionString: "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres",,
  channelName: "mychannel",
  gatewayOptions: {
    identity: signingCredential.keychainRef,
    wallet: {
      keychain: signingCredential,
    },
  },
});

// Initialize the connection to the DB
await persistencePlugin.onPluginInit();
```

You can use the persistent plugin to synchronize ledger state with the database. Here is a sample script that starts monitoring for new blocks:

```typescript
// Start monitoring new blocks.
// Entire ledger is synchronized first with the DB (`syncAll` is called) so this operation can take a while on large ledgers!
persistencePlugin.startMonitor((err) => {
  reject(err);
});

// Show current status of the plugin
persistencePlugin.getStatus();
```

> See [plugin integration tests](./src/test/typescript/integration) for complete usage examples.

### Building/running the container image locally

In the Cacti project root say:

```sh
DOCKER_BUILDKIT=1 docker build ./packages/cactus-plugin-persistence-fabric/ -f ./packages/cactus-plugin-persistence-fabric/Dockerfile -t cactus-plugin-persistence-fabric
```

## Endpoints

### StatusV1 (`/api/v1/plugins/@hyperledger/cactus-plugin-persistence-fabric/status`)

- Returns status of the plugin (latest block read, failed blocks, is monitor running, etc...)

### Plugin Methods

- Most of the plugin functionalities are currently not available through OpenAPI interface, please use direct method calls instead.

#### `onPluginInit`

- Should be called before using the plugin.

#### `shutdown`

- Close the connection to the DB, cleanup any allocated resources.

#### `getStatus`

- Get status report of this instance of persistence plugin.

#### `startMonitor`

- Start the block monitoring process. New blocks from the ledger will be parsed and pushed to the database.

#### `stopMonitor`

- Stop the block monitoring process.

#### `syncFailedBlocks`

- Walk through all the blocks that could not be synchronized with the DB for some reasons and try pushing them again.

#### `syncAll`

- Synchronize entire ledger state with the database.

## Running the tests

To run all the tests for this persistence plugin to ensure it's working correctly execute the following from the root of the `cactus` project:

```sh
npx jest cactus-plugin-persistence-fabric
```

## Contributing

We welcome contributions to Hyperledger Cacti in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

### Quick plugin project walkthrough

#### `./src/main/json/openapi.json`

- Contains OpenAPI definition.

#### `./src/main/sql/schema.sql`

- Database schema for Fabric data.

#### `./src/main/typescript/web-services`

- Folder that contains web service endpoint definitions.

#### `./plugin-persistence-fabric`

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
