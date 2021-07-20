---
id: getting-started
title: Getting Started
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

This document details how to get the system running end-to-end locally.

# Overview

A comprehensive demonstrations of basic interoperation flows for trusted data sharing among networks built on Corda and Hyperledger Fabric require 9 different components:

- [Fabric testnet](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/fabric/dev) - A pair of basic Fabric networks for testing interop flows
- [Corda testnet](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/corda) - A basic Corda network for testing interop flows
- [Relay](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/relay) - The daemon and protocol for cross-DLT interoperability. Two instances of this project is needed, one for the Corda network and one for the Fabric network
- [Fabric driver](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/drivers/fabric-driver) - Driver used by the Fabric networks relay to communicate with the Fabric testnet
- [Corda driver](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/drivers/corda-driver) - Driver used by the Corda networks relay to communicate with the Corda testnet
- [Corda interop app](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/network/corda-interop-app) CorDapp used to handle interop duties between the relay and the application
- [Corda client app](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/samples/corda/corda-simple-application) - CorDapp and client used to trigger interop flows initiated from the Corda side and to manage Corda state
- [Fabric client](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/samples/fabric/fabric-cli) - Fabric client used to trigger interop flows initiated from the Fabric side and to manage Fabric state
- [Fabric Interop chaincode](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/network/fabric-interop-cc) - The Fabric interoperability contracts handle the dual process of servicing requests for views from external networks, and verifing requested views for integrity

In the **Setup** section below, we detail the steps using which you can bring up networks and share data among them using interoperation flows using the default configuration settings. To customize these settings (e.g., hostnames, ports), refer to the **Configuration** section at the end of this page.

# Setup

_Note_: The default configuration is for a development setup, therefore all components are run on `localhost`, many within Docker containers.

Follow the instructions below to build and run components followed by interoperation flows. These instructions have been tested on Ubuntu Linux (bash shell) and Mac OS. In general, they should work on any system and shell as long as the various dependenices have been installed and configured.

## Prerequisites

### Software
Before starting, make sure you have the following software installed on your host machine:
- Curl: _install using package manager, like `apt` on Debian/Ubuntu Linux_
- Git: [sample instructions](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- Docker: [sample instructions](https://docs.docker.com/engine/install/) (Latest version)
- Docker-Compose: [sample instructions](https://docs.docker.com/compose/install/) (Latest version)
- Golang: [sample instructions](https://golang.org/dl/) (Version 1.15 or above)
- Java (JDK and JRE): [sample instructions](https://openjdk.java.net/install/) (Version 8)
- Node.js and NPM: [sample instructions](https://nodejs.org/en/download/package-manager/) (Version 11 to Version 14 Supported)
- Yarn: [sample instructions](https://classic.yarnpkg.com/en/docs/install/)
- Rust: [sample instructions](https://www.rust-lang.org/tools/install)
  * Ensure that the installed version of Rust is 1.52.0 or below by running `rustc --version`. If the version is 1.53.0 or above, run `rustup default 1.52.0` to set the appropriate version.
- Protoc (Protobuf compiler): _Golang should already be installed and configured._
  * Default method: Run the following with `sudo` if necessary. This will install both the protobuf compiler and the Go code generator plugins.
    ```
    apt-get install protobuf-compiler
    go get -u google.golang.org/protobuf/cmd/protoc-gen-go
    go get -u google.golang.org/grpc/cmd/protoc-gen-go-grpc
    ```
  * If the above method installs an older version of `protoc` (check using `protoc --version`), say below 3.12.x, you should download pre-compiled binaries instead. (With an older version, you may see errors while attempting to launch and setup the Fabric networks).
    ```
    sudo apt-get remove protobuf-compiler
    curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v3.15.6/protoc-3.15.6-linux-x86_64.zip
    sudo apt-get install unzip
    unzip protoc-3.15.6-linux-x86_64.zip -d <some-folder-path>
    export PATH="$PATH:<some-folder-path>/bin"
    go get -u google.golang.org/protobuf/cmd/protoc-gen-go
    go get -u google.golang.org/grpc/cmd/protoc-gen-go-grpc
    ```
    _Note_: The latest version at present is `3.15.6`, but you should check the above link to find the most current version before running the above steps.

### Credentials
Make sure you have an SSH or GPG key registered in https://github.com to allow seamless cloning of repositories (at present, various setup scripts clone repositories using the `https://` prefix but this may change to `git@` in the future).

#### Package Access Token:
Create a personal access token with `read:packages` accesss in github in order to use modules published in github packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.

## Getting the Code and Documentation

Clone the [weaver-dlt-interoperability](https://github.com/hyperledger-labs/weaver-dlt-interoperability) repository. The code to get a basic test network up and running and test data-sharing interoperation flows lies in the subfolder `tests/network-setups`, which should be your starting point, though the setups will rely on other parts of the repository, as you will find out in the instructions given on this page.

## Hyperledger Fabric Components

Using the sequence of instructions below, you can start two separate Fabric networks, each with a single channel and application contract (chaincode). You can also start an interoperation contract, a relay and a _driver_ acting on behalf of each network. You can build a Fabric CLI tool with which you can initialize both networks' ledgers with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample key-value pairs that can be shared during subsequent interoperation flows.

### Fabric Network

The code for this lies in the `tests/network-setups` folder.

This folder contains code to create and launch networks `network1` and `network2` of identical specifications:
- Network: 1 peer, 1 peer CA, 1 ordering service node, 1 ordering service CA
- Single channel named `mychannel`
- Single contract named `simplestate` (deployed on `mychannel`) that supports simple transactions (`Create`, `Read`, `Update`, `Delete`) involving storage and lookup of <key, value> pairs.

Follow the instructions below to build and launch the networks:
- Navigate to the `tests/network-setups/fabric/dev` folder.
- To spin up both network1 and network2 with interoperation chaincode installed, run:
  ```
  make start-interop
  ```
- (_Note_: If you do not wish to test Fabric-Fabric interoperation, you can choose to install only one of the two networks along with its interoperation chaincode. For `network1`, run `make start-interop-network1`, and for `network2`, run `make start-interop-network2`.)

For more information, refer to the associated [README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/fabric/dev).

**Troubleshooting Tips**:
- If you see any errors during the launches, re-check the prerequisites (software installations and credentials). Ensure your network connection is working. As a safe bet, you can retry after cleanup: kill and remove all Docker containers and associated volumes.
- If `protoc` or `protoc-gen-go` throws an error, reinstall `protoc` and `protoc-gen-go` using suggestions made in the Prerequisites section above.

### Fabric Client (fabric-cli)

The CLI is used to interact with a Fabric network, configure it and run chaincode transactions to record data on the channel ledger or query data. It is also used to interact with remote networks through the relay in order to trigger an interoperation flow for data request and acceptance.

The `fabric-cli` source code is located in the `samples/fabric/fabric-cli` folder.

#### Prerequisites

If you are using a Linux system, make sure that lib64 is installed.

_Note_: The setup and running instructions below were tested with all Node.js versions from v11.14.0 to v14.17.3.

#### Installation

You can install `fabric-cli` as follows:
- Navigate to the `samples/fabric/fabric-cli` folder.
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created [above](#package-access-token)..
- Run the following to install dependencies:
  ```bash
  npm install
  ```
- Use the `fabric-cli` executable in the `bin` folder for subsequent actions.

#### Configuration

During bootstrap, the ledgers in both `network1` and `network2` must be populated with the following information scoped by the interoperation chaincode:
- Access control policies governing requests from foreign networks
- Security group info for foreign networks (i.e., identities of network units and their membership providers' certificate chains)
- Verification policies for proofs supplied by foreign networks
Knowledge of foreign networks that must be configured in this stage is as follows:
- `network1` has policies and security group info for `network2` and `Corda_Network`
- `network2` has policies and security group info for `network1` and `Corda_Network`
(_`Corda_Network` will be launched later._)
The ledgers must also be populated with sample key-value pairs for testing interoperation flows, scoped by the sample application chaincode.

Prepare `fabric-cli` for configuration as follows:
- Navigate to the `samples/fabric/fabric-cli` folder.
- Create a `config.json` file by copying the `config.template.json` and setting (or adding or removing) suitable values:
  * For each network, the relay port and connection profile paths are specified using the keys `relayPort` and `connProfilePath` respectively.
    - Replace `<PATH-TO-WEAVER>` with the absolute path location of the `weaver-dlt-interoperability` clone folder.
    - Otherwise, leave the default values unchanged.
- Create a `.env` file by copying `.env.template` and setting suitable parameter values:
  * The `MEMBER_CREDENTIAL_FOLDER` should refer to the folder containing the credentials (security group and policy info) of all the foreign networks.
    - If you specify a non-existent or new folder, `fabric-cli` will automatically generate sample credentials for you in that folder.
    - For this exercise, simply point to the folder `src/data/credentials` (_you must specify the full absolute path here_).
  * The `CONFIG_PATH` must point to a JSON file that contains connection info for networks and relays.
    - For this exercise, set the value to `./config.json`.
  * Leave the default values unchanged for the other parameters.
- Run the following commands:
  ```
  ./bin/fabric-cli env set-file ./.env
  ```
- If you haven't specified CONFIG_PATH environment variable in .env, then run this:
  ```
  ./bin/fabric-cli config set-file ./config.json
  ```
  **NOTE:** Only one thing is required, either specify CONFIG_PATH in .env file or run the above command, not both.

See the [Fabric CLI](#fabric-cli) section for more information.

Finally, to prepare both `network1` and `network2` for interoperation, run:

```bash
./bin/fabric-cli configure all network1 network2
```

### Fabric Relay

The relay is a module acting on behalf of a network, enabling interoperation flows with other networks by communicating with their relays.
The code for this lies in the `core/relay` folder.

#### Running Relay in Host

##### Building

_Prerequisite_: make sure Rust is already installed and that the `cargo` executable is in your system path (after installation of Rust, this should be available in `$HOME/.cargo/bin`); you can also ensure this by running `source "$HOME/.cargo/env"`.

Build the generic (i.e., common to all DLTs) relay module as follows:
- Navigate to the `core/relay` folder.
- Run the following:
  ```bash
  make
  ```
  
##### Deployment

An instance or a relay can be run using a suitable configuration file. Samples are available in the `core/relay/config` folder.

Run a relay for `network1` as follows:
- Navigate to the `core/relay` folder.
- Run the following:
  ```bash
  RELAY_CONFIG=config/Fabric_Relay.toml cargo run --bin server
  ```

Run a relay for `network2` as follows (_do this only if you wish to test interoperation between the two Fabric networks `network1` and `network2`_)
- Navigate to the `core/relay` folder.
- Run the following:
  ```bash
  RELAY_CONFIG=config/Fabric_Relay2.toml cargo run --bin server
  ```

For more information, see the [relay README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/relay).


### Fabric Driver

A driver is a DLT-specific plugin invoked by the relay while channelling external data queries to the local peer network and collecting a response with proofs. The Fabric driver is built as a Fabric client application on the `fabric-network` NPM package.
The code for this lies in the `core/drivers/fabric-driver` folder.

#### Running Fabric Driver

##### Configuring

In the `core/drivers/fabric-driver` folder, copy `.env.template` to `.env` and update `CONNECTION_PROFILE` to point to the connection profile of the fabric network (e.g. `<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json`)

Configure `fabric-driver` for `network1` as follows:
- Navigate to the `core/drivers/fabric-driver` folder.
- Create a `.env` file by copying `.env.template` and setting suitable parameter values:
  * The `CONNECTION_PROFILE` should point to the absolute path of the connection profile for `network1`.
    - For this exercise, specify the path `<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json` (_you must specify the full absolute path here_).
    - `<PATH-TO-WEAVER>` here is the absolute path of the `weaver-dlt-interoperability` clone folder.
  * Leave the default values unchanged for the other parameters. The relay and driver endpoints as well as the network name are already specified.

##### Building

Build the Fabric driver module as follows:
- Navigate to the `core/drivers/fabric-driver` folder.
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created above.
- Run the following:
  ```bash
  make build-local
  ```
_Note_: `postinstall` applies a customization patch to the `fabric-network` NPM library.

##### Running

Run a Fabric driver for `network1` as follows:
- Navigate to the `core/drivers/fabric-driver` folder.
- Run the following:
  ```bash
  npm run dev
  ```

Run a Fabric driver for `network2` as follows (_do this only if you wish to test interoperation between the two Fabric networks `network1` and `network2`_)
- Navigate to the `core/drivers/fabric-driver` folder.
- Run the following:
  ```bash
  CONNECTION_PROFILE=<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network2/peerOrganizations/org1.network2.com/connection-org1.json NETWORK_NAME=network2 RELAY_ENDPOINT=localhost:9083 DRIVER_ENDPOINT=localhost:9095 npm run dev
  ```
_Note_: the variables we specified earlier in the `.env` are now passed in the command line. Alternatively, you can make a copy of the `fabric-driver` folder with a different  name and create a separate `.env` file within it that contains links to the connection profile, relay, and driver for `network2`.

## Corda Components

Using the sequence of instructions below, you can start a Corda network and run an application Cordapp on it. You can also run an interoperation Cordapp, a relay and a _driver_ acting on behalf of the network. You can initialize the network's vault with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample state values that can be shared during subsequent interoperation flows.


### Corda Network

The Corda network code lies in the `tests/network-setups/corda` folder. You can launch a network consisting of one node (`PartyA`) and one notary. This network uses `samples/corda/corda-simple-application` which maintains a state of type `SimpleState`, which is a set of key-value pairs (of strings).
Following steps will build above cordapp and a corda-client as well in `samples/corda/client`.

To start the network without building weaver dependencies locally, skip next section and go to [Running with Interoperation Cordapp from Github Packages](#running-with-interoperation-cordapp-from-github-packages),
else go to [Running with Local Interoperation Cordapp](#running-with-local-interoperation-cordapp).

#### Running with Local Interoperation Cordapp

This will build the Interoperation Cordapp in `core/network/corda-interop-app` locally.
Follow the instructions below to build and launch the network:
- Navigate to the `tests/network-setups/corda` folder.
- To spin up the Corda network with the interoperation Cordapp, run:
  ```bash
  make start-local
  ```
  
#### Running with Interoperation Cordapp from Github Packages

This will fetch the already built Interoperation Cordapp from Github Packages.
Follow the instructions below to build and launch the network:
- Navigate to the `tests/network-setups/corda` folder.
- Create copy of `artifactory.properties.template` as `artifactory.properties`.
- Replace `<GITHUB email>` with your github email, and `<GITHUB Personal Access Token>` with the access token created [above](#package-access-token).
- To spin up the Corda network with the interoperation Cordapp, run:
    ```bash
    make start
    ```

If the Corda node and notary start up successfully, you should something like the following:

![Corda network startup screenshot](/setup-assets/Corda_network.jpg)

### Corda Relay

The relay was built earlier, so you just need to use a different configuration file to start a relay for the Corda network.

Run a relay in host as follows:
- Navigate to the `core/relay` folder.
- (Make sure you've already built the relay by running `make`.)
- Run the following:
  ```bash
  RELAY_CONFIG=config/Corda_Relay.toml cargo run --bin server
  ```

If the relay starts up successfully, the following will be logged on your terminal:

```
Relay Name: "Corda_Relay"
RelayServer listening on [::1]:9081
```

### Corda Driver

The code for this lies in the `core/drivers/corda-driver` folder.

To build the driver without building weaver dependencies locally, skip next section and go to [Building Corda Driver with dependencies from Github Packages](#building-corda-driver-with-dependencies-from-github-packages),
else go to [Building Corda Driver Locally](#building-corda-driver-locally).

#### Building Corda Driver Locally

This will build all the weaver dependencies locally.
Build the Corda driver module as follows:
- Navigate to the `core/drivers/corda-driver` folder.
- Run the following:
  ```bash
  make build-local
  ```
  
#### Building Corda Driver with dependencies from Github Packages

This will fetch already built weaver dependencies from Github Packages.
Build the Corda driver module as follows:
- Navigate to the `core/drivers/corda-driver` folder.
- Create copy of `artifactory.properties.template` as `artifactory.properties`.
- Replace `<GITHUB email>` with your github email, and `<GITHUB Personal Access Token>` with the access token created [above](#package-access-token).
- Run the following:
```bash
make build
```

#### Running

Run a Corda driver as follows:
- Navigate to the `core/drivers/corda-driver` folder.
- Run the following:
  ```bash
  ./build/install/corda-driver/bin/corda-driver
  ```

If the driver starts successfully, it should log the following message on your terminal:
```
Corda driver gRPC server started. Listening on port 9099
```

### Corda Client (Application)

Now that the network is launched, the client application (which we built earlier) needs to be exercised to generate network (ledger) state in preparation to test interoperation flows.

#### Bootstrapping Network and Application State
Just as we did for either Fabric network, the Corda network ledger (or _vault_ on each node) must be initialized with access control policies, verification policies, and security group information for the two Fabric networks. Further, sample key-value pairs need to be recorded so we can later share them with a Fabric network via an interoperation flow.

Bootstrap the Corda network and application states as follows:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  ```bash
  make initialise-vault
  ```

# Testing Interoperation Scenarios

Once the whole system is running, these flows can be executed to test the various interoperation flows i.e. Fabric to Corda, Corda to Fabric and Fabric to Fabric.
Once you have the networks, the relays, and the drivers, running, and the ledgers bootstrapped, you can test three different data-sharing combinations by triggering interoperation flows:
1. **Corda to Fabric**: The Corda network requests state and proof from either Fabric network
2. **Fabric to Corda**: Either Fabric network requests state and proof from the Corda network
3. **Fabric to Fabric**: One Fabric network requests state and proof from another Fabric network

## Corda to Fabric

To test the scenario where `Corda_Network` requests the value of the state (key) `a` from `network1`, do the following:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  ```bash
  ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9080/network1/mychannel:simplestate:Read:a
  ```
- Query the value of the requested state (key) `a` in `Corda_Network` using the following (replace LinearId with the CorDapp simplestate linearId value obtained in the previous command):
  ```bash
  ./clients/build/install/clients/bin/clients get-state a
  ```

To test the scenario where `Corda_Network` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  ```bash
  ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9083/network2/mychannel:simplestate:Read:Arcturus
  ```
- Query the value of the requested state (key) `a` in `Corda_Network` using the following (replace LinearId with the CorDapp simplestate linearId value obtained in the previous command):
  ```bash
  ./clients/build/install/clients/bin/clients get-state Arcturus
  ```

## Fabric to Corda

To test the scenario where `network1` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=H --local-network=network1 --sign=true --requesting-org=Org1MSP localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
  ```
- Query the value of the requested state (key) `H` in `network1` using the following (replace the Args with the Args value obtained in the previous command):
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network1
  ```

To test the scenario where `network2` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=H --local-network=network2 --sign=true --requesting-org=Org1MSP localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
  ```
- Query the value of the requested state (key) `H` in `network2` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network2
  ```

## Fabric to Fabric

To test the scenario where `network1` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=Arcturus --local-network=network1 --requesting-org=Org1MSP localhost:9083/network2/mychannel:simplestate:Read:Arcturus
  ```
- Query the value of the requested state (key) `Arcturus` in `network1` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["Arcturus"]' --local-network=network1
  ```

To test the scenario where `network2` requests the value of the state (key) `a` from `network1`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=a --local-network=network2 --requesting-org=Org1MSP localhost:9080/network1/mychannel:simplestate:Read:a
  ```
- Query the value of the requested state (key) `a` in `network2` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["a"]' --local-network=network2
  ```

# Tear Down the Setup

Bring down the various components as follows:
- Simply terminate the various relays and drivers, which are running in the foreground in different terminals
- To bring down the Corda network:
  * Navigate to the `tests/network-setups/corda` folder.
  * Run the following:
  ```bash
  make clean
  ```
- To bring down one or both of the Fabric networks:
  * Navigate to the `tests/network-setups/fabric/dev` folder.
  * Run the following:
  ```bash
  make clean
  ```

# Configuration

If you don't want to run all the system components on your local machine, or if you want to select different host names or ports, you can tweak the configurations appropriately. Here is a list, classified by the DLT type.

## Corda

### Relay

To run the relay on a different port from the default (`9081`), do the following:
- Navigate to the `core/relay` folder.
- Update the `port` field in `config/Corda_Relay.toml`.
- To ensure that the relay of `network1` can communicate with this relay, update the `port` field in the `relays.Corda_Relay` section in `config/Fabric_Relay.toml` with the same value.
- To ensure that the relay of `network2` can communicate with this relay, update the `port` field in the `relays.Corda_Relay` section in `config/Fabric_Relay2.toml` with the same value.
- (You can update host names in similar locations, by adjusting the `hostname` field.)
- When you attempt a Fabric to Corda interoperation flow, use the new host name or port (instead of `localhost:9081`).

### Driver

To run the driver on a different port from the default (`9099`), do the following:
- Navigate to the `core/drivers/corda-driver` folder.
- Set the environment variable `DRIVER_PORT` appropriately while running the executable as follows:
  ```bash
  DRIVER_PORT=<port> ./build/install/corda-driver/bin/corda-driver
  ```

To ensure that the relay can connect to this driver:
- Navigate to the `core/relay` folder.
- Update the `port` field in the `drivers.Corda` section in `config/Corda_Relay.toml` with the same value.

### Network

_Note_: Currently, all the Corda nodes must be running on the same machine (`localhost` or some other) for seamless communication.

To change the ports the Corda nodes are listening on, do the following:
- Navigate to the `tests/network-setups/corda` folder.
- Update the exposed ports in `docker-compose.yml` (defaults are `10003` for the `notary` container and `10006` for the `partya` container).
- Navigate to the `samples/corda/corda-simple-application` folder.
- Update the `CORDA_HOST` (default is `localhost`) and `CORDA_PORT` (default is `10006`) environment variables on your host machine to reflect the above update, or run the client bootstrapping script as follows:
  ```bash
  CORDA_HOST=<hostname> CORDA_PORT=<port> make initialise-vault
  ```
- When you attempt a Fabric to Corda interoperation flow, use the new host name and port values as in the following example (`network1` requesting `Corda_Network`):
  ```bash
  ./bin/fabric-cli interop --local-network=network1 --requesting-org=org1.network1.com localhost:9081/Corda_Network/<CORDA_HOST>:<CORDA_PORT>#com.cordaSimpleApplication.flow.GetStateByKey:H`
  ```

### Client Application

The config files used to initialise the network's verification policies, access control policies, and security group info, contain the address (host name and port) of the Corda node.
To update the address of the Corda node, do the following:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Edit the `rules --> resource` field in line 7 in `clients/src/main/resources/config/FabricNetworkAccessControlPolicy.json` by replacing `localhost:10006` with `<CORDA_HOST>:<CORDA_PORT>` as specified in the previous section.

## Fabric

### Relay

To run the relay on a different port from the default (`9080` for `network1` and `9083` for `network2`), do the following:
- Navigate to the `core/relay` folder.
- Update the `port` field in `config/Fabric_Relay.toml` (for `network1`) or `config/Fabric_Relay2.toml` (for `network2`).
- To ensure Fabric-Fabric relay communication, update the foreign relay port in the `port` field in the `relays.Fabric_Relay` section in either of the above files.
- To ensure that the Corda network's relay can communicate with this relay, update the `port` field in the `relays.Fabric_Relay` section in `config/Corda_Relay.toml`.
- (You can update host names in similar locations, by adjusting the `hostname` field.)
- When you attempt a Fabric to Fabric or Corda to Fabric interoperation flow, use the new host name or port (instead of `localhost:9081` or `localhost:9083`).
- Navigate to the `core/drivers/fabric-driver` folder.
- Update the `RELAY_ENDPOINT` variable in `.env` or specify `RELAY_ENDPOINT=<hostname>:<port>` in the command line while running the driver using `npm run dev`.
- Navigate to the `samples/fabric/fabric-cli` folder.
- Update the `relayEndpoint` variables appropriately.

### Driver

The `fabric-driver` configuration can be controlled by environment variables either set in `.env` in the `core/drivers/fabric-driver` folder (or a copy if you created one) or passed in the command line when you run `npm run dev` to start the driver. The relevant variables you can control when you make any change to the setup are:
- `CONNECTION_PROFILE`: this is the path to the connection profile. If you make changes to the network or use a different one, create a new connection profile and point to it using this variable.
- `RELAY_ENDPOINT`: this is the endpoint of the relay (hostname and port), and you can adjust it as described in the previous section; this is where the relay will be listening for incoming requests and from where the relay will channel foreign requests as well.
- `DRIVER_ENDPOINT`: this is the hostname and port the driver itself will bind to, and you can change it from the default (`localhost:9090` for `network1` and `localhost:9095` for `network2`) as per your need

### Fabric CLI

You can adjust settings for `fabric-cli` in the `.env` and `config.json` (in the `samples/fabric/fabric-cli` folder) as described earlier.

Important environment variables (in `.env`) are:
- `DEFAULT_CHANNEL`: this is the name of the channel the CLI will interact with. If you build a new channel or network, update the channel name here.
- `DEFAULT_CHAINCODE`: this is the name of the interoperaton chaincode the CLI will submit transactions and queries to for policy and security group bootstrapping. If you wish to test with a modified interoperation chaincode with a different name, update this value.
- `MEMBER_CREDENTIAL_FOLDER`: as described earlier, this is an absolute path that points to policies and security group info associated with foreign networks. You can adjust this info for the existing three networks or add credentials for another network you wish to test interoperation flows with.
- `LOCAL`: this is a boolean, indicating whether the network to connect to is running on (and as) `localhost`
- `DEFAULT_APPLICATION_CHAINCODE`: this is the name of the application chaincode which maintains information that can be shared (with proof) with other networks upon request using interoperation. You may write and deploy your own chaincode and use its name here instead of the default `simplestate`.
- `CONFIG_PATH`: this points to the JSON file containing the configurations of all the Fabric networks that need to be configured using the `fabric-cli`.

The `config.json` (which can have a different name as long as you add the right reference to `.env` and configure `fabric-cli` suitably) has the following structure (it can have any number of networks specified):

```
{
  "network1": {
    "connProfilePath": "",
    "relayEndpoint": ""
  },
  "network2": {
    "connProfilePath": "",
    "relayEndpoint": ""
  }
}

```
- `connProfilePath`: absolute path of the network's connection profile
- `relayEndpoint`: hostname and port of the particular network's relay (make sure you sync this with any changes made to that relay's configuration)


## Building Components Locally

### Fabric Interoperation Node SDK

A library, as companion to the `hyperledger/fabric-sdk-node`, is defined in the `sdks/fabric/interoperation-node-sdk` folder. This contains functions for Fabric Gateway-based applications to exercise interoperation capabilities via relays and also a number of utility/helper functions. The Fabric-CLI tool, which we will use later, depends on this library. This library is published as github packages here: [hyperledger-labs packages](https://github.com/orgs/hyperledger-labs/packages), thus it is **not required** to build this library for the testnet demo.

(OPTIONAL) To build the library, do the following:
- Navigate to the `sdks/fabric/interoperation-node-sdk` folder.
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created [above](#package-access-token).
- Run the following command:
  ```bash
  make build-local
  ```
  
### Interoperation Cordapp

The interoperation Cordapp is deployed to run as part of any Corda application flow that involves cross-network interoperation.

(OPTIONAL) Build the interoperation Cordapp as follows:
- Navigate to the `core/network/corda-interop-app` folder.
- Run the following to create the JAR files on which other Corda network components will depend on:
  ```bash
  make build-local
  ```

### Corda Client (Application)

This is a simple Cordapp that maintains a state of type `SimpleState`, which is a set of key-value pairs (of strings).
The code for this lies in the `samples/corda/corda-simple-application` folder.

#### (OPTIONAL) Building

Build the `corda-simple-application` Cordapp as follows:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  ```bash
  make build-local
  ```
