# SATP Gateway

The Weaver relay has been augmented to include a sample SATP implementation, thereby making it function as a SATP gateway. Here are the steps to run and test this implementation:

(_Note_: all `cd` commands in this page are meant to be run from the root folder of your clone of the Cacti repository.)

## Run Two Fabric Test-Networks
```
$ cd weaver/tests/network-setups/fabric/dev
$ make start-interop-local CHAINCODE_NAME=satpsimpleasset
```

## Initialize the Logging Database

Before running the gateway, you need to ensure that SQLite (the default database for logs) is installed. Sample instructions for Ubuntu are given below:

```
sudo apt-get update
sudo apt-get install sqlite3 libsqlite3-dev
```

Use the SQLite tool on your system to create a SQLite database named 'gateway_log.db'. In Ubuntu, run the following command (after the above installation) for this:
```
$ cd weaver/core/relay
$ sqlite3 gateway_log.db
```
The above command will create a database file and also drop an SQLite shell, where you must create a table (for recording log entries) using the following SQL query:
```
CREATE TABLE log_entries (
    id INTEGER PRIMARY KEY,
    debug_level TEXT,
    timestamp TEXT,
    request_id TEXT,
    request TEXT,
    step_id TEXT,
    operation TEXT,
    network_id TEXT,
    gateway_id TEXT,
    received TEXT,
    details TEXT
);
```
You can do this and exit the SQLite shell as follows:
```
sqlite> CREATE TABLE log_entries (
   ...>     id INTEGER PRIMARY KEY,
   ...>     debug_level TEXT,
   ...>     timestamp TEXT,
   ...>     request_id TEXT,
   ...>     request TEXT,
   ...>     step_id TEXT,
   ...>     operation TEXT,
   ...>     network_id TEXT,
   ...>     gateway_id TEXT,
   ...>     received TEXT,
   ...>     details TEXT
   ...> );
sqlite> .quit
```
At any time, you can generate a readable form of the database as follows (example below):
```
$ sqlite3 gateway_log.db .dump > gateway_log.sql
```

## Run the Gateways

We will use `Fabric_Relay` as the gateway for `network1` and `Fabric_Relay2` for `network2`. Install the components and set up appropriate configurations for each according to instructions in https://hyperledger-cacti.github.io/cacti/weaver/getting-started/test-network/setup-local/#fabric-relay. Use the same instructions to launch relays (as called out below):

To launch a gateway for Fabric `network1`, run from a new terminal window:
```
$ cd weaver/core/relay
$ RELAY_CONFIG=config/Fabric_Relay.toml cargo run --bin server
```
To launch a gateway for Fabric `network2`, run from a new terminal window:
```
$ cd weaver/core/relay
$ RELAY_CONFIG=config/Fabric_Relay2.toml cargo run --bin server
```
(_Note_: by running the above commands, the logs from both gateways will be written to the same `gateway_log.db` file. To separate these logs, you should make a copy of the `relay` folder, create a `gateway_log.db` in each, and launch separate relay instances from both folders.)

## Run the Fabric Drivers

Ensure that you have the correct configuration in the file .env
In a new terminal, run the following commands:
We will use the default drivers associated with `Fabric_Relay` and `Fabric_Relay2` as specified in https://hyperledger-cacti.github.io/cacti/weaver/getting-started/test-network/setup-local. Install the components and set up appropriate configurations for each according to instructions in https://hyperledger-cacti.github.io/cacti/weaver/getting-started/test-network/setup-local/#fabric-driver. Use the same instructions to launch drivers (as called out below):

To launch a driver for Fabric `network1`, run from a new terminal window:
```
$ cd weaver/core/drivers/fabric-driver
$ npm run dev
```
To launch a driver for Fabric `network2`, run from a new terminal window:
```
$ cd weaver/core/drivers/fabric-driver
$ CONNECTION_PROFILE=/opt/gopath/src/github.com/VRamakrishna/cacti/weaver/tests/network-setups/fabric/shared/network2/peerOrganizations/org1.network2.com/connection-org1.json NETWORK_NAME=network2 RELAY_ENDPOINT=localhost:9083 DRIVER_ENDPOINT=localhost:9095 npm run dev
```

## Configure the Fabric-CLI

Configure Fabric-CLI parameters in a `config.json` and a `.env` as indicated in https://hyperledger-cacti.github.io/cacti/weaver/getting-started/test-network/ledger-initialization/#initializing-the-fabric-networks (use instructions for relays and drivers deployed in host machines). In the `config.json`, make sure the `chaincode` values are set to `satpsimpleasset`. For the `.env`, only the following settings are mandatory:
```
MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials
CONFIG_PATH=./config.json
DEFAULT_APPLICATION_CHAINCODE=satpsimpleasset
```
Configure the Fabric-CLI as per the instructions in the above link (as called out below):
```
$ cd weaver/samples/fabric/fabric-cli
$ ./bin/fabric-cli env set-file ./.env
```

## Initialize Asset Records in `network1`

Use the Fabric-CLI to initialize a set of sample assets only in `network1`. In a new terminal, run:
```
$ cd weaver/samples/fabric/fabric-cli
$ ./bin/fabric-cli configure asset add --target-network=network1 --type=bond --data-file=./src/data/assets.json

```

## Ensure that Recipient Wallet ID is available with the `network2` Driver

Copy wallet ID of user `bob` to the wallet of the `network2` Fabric driver. (_Note_: this is a shortcut for convenience. The driver only needs to know the certificate adn doesn't need the full wallet ID, which includes the secret signing key.)
```
$ cd weaver/samples/fabric/fabric-cli
$ cp src/wallet-network2/bob.id <PATH_TO_WEAVER>/core/drivers/fabric-driver/wallet-network2

```

## Run the Sample SATP client

This client will trigger the SATP protocol by sending a request to `network1`'s relay to transfer an asset to `network2` via its relay. The command structure is as follows:
```
$ cargo run --bin satp_client <source_relay_name> <source_network_name> <source_asset_type> <source_asset_id> <sender_id> <source_network_contract_id> <destination_network_name> <destination_relay_name> <recipient_id> <destination_network_contract_id>
```
In a new terminal, run the following commands (to transfer an asset from one Fabric testnet, `network1`, to another, `network2`):

```
$ cd weaver/core/relay
$ cargo run --bin satp_client Fabric_Relay network1 bond01 a05 alice satpsimpleasset network2 Fabric_Relay2 bob satpsimpleasset

```

View the messages exchanged between the two gateways in their corresponding terminal windows.

Verify the asset transfer success by checking that the asset is not present in `network1` and instead now belongs (with a different id and type) to `bob` in `network2` using the following Fabric-CLI commands:
```
$ cd weaver/samples/fabric/fabric-cli
$ ./bin/fabric-cli chaincode query --user=alice mychannel satpsimpleasset ReadAsset '["bond01","a05"]' --local-network=network1
$ ./bin/fabric-cli chaincode query --user=bob mychannel satpsimpleasset ReadAsset '["bond01_new","a05_new"]' --local-network=network2
```

