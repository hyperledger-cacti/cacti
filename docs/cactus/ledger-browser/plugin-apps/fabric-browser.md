# Fabric Browser App

Application for browsing ledger state stored in a database by the Cacti Fabric Persistence Plugin.

## Features

- Browse ledger blocks and transactions.
- View transaction details, including sender/endorser information, chaincode, and decoded method arguments.

## Setup

### Persistence Plugin

#### Supabase

The persistence plugin requires a Supabase instance to save ledger data. You can use the same Supabase instance as for the GUI (but in a separate schema), or create a separate instance specifically for this plugin.

To set up the GUI app, you'll need a `Supabase URL`, `API key`, and the `Schema` under which the data resides in the database.

Additionally, you'll need a `PostgreSQL connection string` to start the persistence plugin.

##### Expose custom schema

Fabric data is stored in a custom schema named `fabric`. To access this data from our GUI application, you need to ensure the schema is exposed. If you're using our [supabase-all-in-one](https://github.com/hyperledger-cacti/cacti/tree/main/tools/docker/supabase-all-in-one) image, all application schemas, including `fabric`, are already exposed, so you can skip this step. However, if you're using Supabase Cloud, you'll need to go to the [API settings](https://supabase.com/dashboard/project/_/settings/api) and add `fabric` to the `Exposed schemas` list.

For more details, refer to [the full guide on custom schemas](https://supabase.com/docs/guides/api/using-custom-schemas) (note that the necessary SQL code has already been executed during the persistence plugin schema setup).

#### Fabric Ledger (Optional)

This step is optional as you can use any running Fabric ledger. However, for testing purposes, you may use our [fabric-all-in-one](https://github.com/hyperledger-cacti/cacti/tree/main/tools/docker/fabric-all-in-one). To start it, execute the following commands from the root of your project:

```shell
# Build
docker build ./tools/docker/fabric-all-in-one/ -f ./tools/docker/fabric-all-in-one/Dockerfile_v2.x -t faio2x

# Run
docker run --detach --privileged --publish-all --name faio2x-testnet faio2x
```

### Persistence Plugin

Follow the instructions in the [plugin README file](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-persistence-fabric).

To quickly set up the plugin for your Fabric ledger, run the complete setup script:

```shell
cd packages/cactus-plugin-persistence-fabric/
# Replace the environment variables with JSON-RPC WS url to your ledger and postgresql connection string to your database instance.
SUPABASE_CONNECTION_STRING=postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres npm run complete-sample-scenario
```

This script will start a test ledger and push some data to it. For details on running this plugin for own ledger, see the plugin documentation (sample setup script).

## Configuration

- `supabaseUrl`: URL of your Supabase instance.
- `supabaseKey`: Supabase API key.
- `supabaseSchema`: Database schema under which Fabric persistence tables were created.

### Sample Configuration

Uses a localhost `supabase-all-in-one` instance with data stored in the `fabric` schema.

```json
{
  "supabaseUrl": "http://localhost:8000",
  "supabaseKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
  "supabaseSchema": "fabric"
}
```

## Test Data Setup

For GUI development, you don't need to start the persistence plugin. Instead, follow these steps to fill the database with sample data.

### Create database schema tables

- Copy the content of `packages/cactus-plugin-persistence-fabric/src/main/sql/schema.sql` into `SQL Editor` of supabase and run the query.
- Alternatively, use `psql`:

```shell
psql "__CONNECTION_STRING_TO_DB__" -f packages/cactus-plugin-persistence-fabric/src/main/sql/schema.sql
```

### Insert sample data

- Copy the content of `packages/cactus-plugin-persistence-fabric/src/test/sql/insert-test-data.sql` into `SQL Editor` of supabase and run the query.
- Alternatively, use `psql`:

```shell
psql "__CONNECTION_STRING_TO_DB__" -f packages/cactus-plugin-persistence-fabric/src/test/sql/insert-test-data.sql
```
