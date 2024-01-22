# SATP Gateway

The Weaver rely has been augmented to include the SATP implementation. Here are the steps to run and test this implementation:

## Run two test Fabric networks
```
$ cd weaver/tests/network-setups/fabric/dev
$ make start-interop-local CHAINCODE_NAME=satpsimpleasset
```

## Run the gateway

Before running the gateway, you need to ensure SQLite (the default database for logs) is installed:

```
sudo apt-get update
sudo apt-get install libsqlite3-dev
```

Use your favorite tool to create a SQLite database named 'gateway_log.db' and create the following table:
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

In a new terminal, run the following commands:
```
$ cd weaver/core/relay
$ RELAY_CONFIG=config/Dummy_Relay.toml cargo run --bin server
```

## Run the Fabric driver

Ensure that you have the correct configuration in the file .env
In a new terminal, run the following commands:

```
$ cd weaver/core/drivers/fabric-driver
$ cat .env

CONNECTION_PROFILE=/home/user/cacti/weaver/tests/network-setups/fabric/network-artifacts/network1/peerOrganizations/org1.network1.com/connection-org1.json
RELAY_ENDPOINT=localhost:9085
RELAY_TLS=false
RELAY_TLSCA_CERT_PATH=path_to_tls_ca_cert_pem_for_relay
DRIVER_ENDPOINT=localhost:9090
DRIVER_TLS=false
DRIVER_TLS_CERT_PATH=path_to_tls_cert_pem_for_driver
DRIVER_TLS_KEY_PATH=path_to_tls_key_pem_for_driver
NETWORK_NAME=network1
DRIVER_CONFIG=
INTEROP_CHAINCODE=interop
MOCK=false
DB_PATH=driverdbs
#WALLET_PATH=/home/user/cacti/weaver/samples/fabric/fabric-cli/src/wallet-network1
WALLET_PATH=/home/user/cacti/weaver/core/drivers/fabric-driver/wallet-network1
DEBUG=true
LEVELDB_LOCKED_MAX_RETRIES=
LEVELDB_LOCKED_RETRY_BACKOFF_MSEC=
ENABLE_MONITOR=false
MONITOR_SYNC_PERIOD=
MEMBER_CREDENTIAL_FOLDER=/home/user/cacti/weaver/samples/fabric/fabric-cli/src/data/credentials
CONFIG_PATH=/home/user/cacti/weaver/samples/fabric/fabric-cli/config.json
DEFAULT_APPLICATION_CHAINCODE=simpleassettransfer
REMOTE_CONFIG_PATH=/home/user/cacti/weaver/samples/fabric/fabric-cli/remote-network-config.json
CHAINCODE_PATH=/home/user/cacti/weaver/samples/fabric/fabric-cli/chaincode.json

```

Run the driver

```
$ cd weaver/core/drivers/fabric-driver
$ make build-local
$ npm run dev
```

# Build the satpsimpleasset chaincode

In a new terminal, run the following commands:

```
$ cd weaver/samples/fabric/satpsimpleasset
$ make build-local
```

# Run the Fabric cli

The Fabric-cli could be used for creating testing assets. Ensure you have the correct configuration. In a new terminal, run the following commands:

```
$ cd weaver/samples/fabric/fabric-cli
$ cat config.json 

{
  "network1": {
    "connProfilePath": "/home/user/cacti/weaver/tests/network-setups/fabric/network-artifacts/network1/peerOrganizations/org1.network1.com/connection-org1.json",
    "relayEndpoint": "localhost:9080",
    "mspId": "Org1MSP",
    "channelName": "mychannel",
    "chaincode": "satpsimpleasset",
    "aclPolicyPrincipalType": "ca"
  },
  "network2": {
    "connProfilePath": "/home/user/cacti/weaver/tests/network-setups/fabric/network-artifacts/network2/peerOrganizations/org1.network2.com/connection-org1.json",
    "relayEndpoint": "localhost:9083",
    "mspId": "Org1MSP",
    "channelName": "mychannel",
    "chaincode": "satpsimpleasset",
    "aclPolicyPrincipalType": "certificate"
  }
}
```

Create sample assets:

```
$ cd weaver/samples/fabric/fabric-cli
$ ./bin/fabric-cli configure asset add --target-network=network1 --type=bond --data-file=./src/data/assets.json

```

Ensure Alice and Bob ids are available:

```
$~/cacti/weaver/samples/fabric/fabric-cli/src/wallet-network1$ cp alice.id /home/user/cacti/weaver/core/drivers/fabric-driver/wallet-network1
$~/cacti/weaver/samples/fabric/fabric-cli/src/wallet-network1$ cp bob.id /home/user/cacti/weaver/core/drivers/fabric-driver/wallet-network1
$~/cacti/weaver/samples/fabric/fabric-cli/src/wallet-network1$ cd ../wallet-network2
$~/cacti/weaver/samples/fabric/fabric-cli/src/wallet-network2$ cp alice.id /home/user/cacti/weaver/core/drivers/fabric-driver/wallet-network2
$~/cacti/weaver/samples/fabric/fabric-cli/src/wallet-network2$ cp bob.id /home/user/cacti/weaver/core/drivers/fabric-driver/wallet-network2

```

## Run the client

This client will trigger the SATP protocol by sending an asset transfer request. In a new terminal, run the following commands:

```
$ cd weaver/core/relay
$ cargo run --bin satp_client "9085" "localhost:9085/Dummy_Network/abc:abc:abc:abc"

```

You should noticed that the messages started to be exchanged between the two gateways. The logs can be seen in the corresponding terminals. 

