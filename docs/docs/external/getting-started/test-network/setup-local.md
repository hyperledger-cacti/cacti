---
id: setup-local
title: Setup with Locally Built Weaver Components
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

In this document, we detail the steps using which you can bring up networks using the default configuration settings and by building Weaver interoperation modules, SDK libraries, and relay drivers locally from your Weaver clone. To customize these settings (e.g., hostnames, ports), refer to the [Advanced Configuration page](./advanced-configuration.md).

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
  * To avoid errors during Weaver Relay compilation, update certain packages (on which the Weaver Relay is dependent) to their latest versions as follows:
    ```
    cargo update -p nom
    cargo update -p lexical-core
    ```
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

## Getting the Code and Documentation

Clone the [weaver-dlt-interoperability](https://github.com/hyperledger-labs/weaver-dlt-interoperability) repository. The code to get a basic test network up and running and test data-sharing interoperation flows lies in the subfolder `tests/network-setups`, which should be your starting point, though the setups will rely on other parts of the repository, as you will find out in the instructions given on this page.

## Common Structures

The `common/protos` folder contains structure definitions in the protobuf format that are used by all the different components. The various `common/protos-*` folders are meant to contain compiled protobufs (in different languages).

To compile the protobufs for JavaScript, do the following:
- Navigate to the `common/protos-js` folder.
- Run the following command:
  ```bash
  make build
  ```

To compile the protobufs for Golang, do the following:
- Navigate to the `common/protos-go` folder.
- Run the following command:
  ```bash
  make build
  ```

To compile the protobufs for Java, do the following:
- Navigate to the `common/protos-java-kt` folder.
- Run the following command:
  ```bash
  make build
  ```

## Hyperledger Fabric Components

Using the sequence of instructions below, you can start two separate Fabric networks, each with a single channel and application contract (chaincode). You can also start an interoperation contract, a relay, and a _driver_ acting on behalf of each network. You can build a Fabric CLI tool with which you can initialize both networks' ledgers with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample key-value pairs that can be shared during subsequent interoperation flows.

### Fabric Interoperation Node SDK

A client-layer library (companion to `hyperledger/fabric-sdk-node`) is defined in the `sdks/fabric/interoperation-node-sdk` folder. This contains functions for Fabric Gateway-based applications to exercise interoperation capabilities via relays and also several utility/helper functions. The Fabric-CLI tool, which we will use later, depends on this library.

To build the library, do the following:
- Navigate to the `sdks/fabric/interoperation-node-sdk` folder.
- Run the following command:
  ```bash
  make build-local
  ```

### Fabric Network

The code for this lies in the `tests/network-setups` folder.

This folder contains code to create and launch networks `network1` and `network2` of identical specifications:
- Network: 1 peer, 1 peer CA, 1 ordering service node, 1 ordering service CA
- Single channel named `mychannel`
- One of the following contracts deployed on `mychannel`, the choice depending on the [interoperability mode](../../interoperability-modes.md) you wish to test:
  * `simplestate` ([Data Sharing](../interop/data-sharing.md)): supports simple transactions (`Create`, `Read`, `Update`, `Delete`) involving storage and lookup of <key, value> pairs.
  * `simplestatewithacl` ([Data Sharing](../interop/data-sharing.md)): identical to `simplestate` but with extra security features to ensure that the Weaver infrastructure cannot be bypassed by a malicious client of the network.
  * `simpleasset` ([Asset Exchange](../interop/asset-exchange.md)): supports creation, modification, transfer, and deletion, as well as locking, unlocking, and claiming, of simple bonds and tokens (examples of non-fungible and fungible assets respectively).
  * `simpleassetandinterop` ([Asset Exchange](../interop/asset-exchange.md)): identical to `simpleasset` but where the locking, unlocking, and claiming logic is imported as a library in the chaincode rather than available in the common Fabric Interoperaton Chaincode (a Weaver component).
  * `simpleassettransfer` ([Asset Exchange](../interop/asset-exchange.md) or [Asset Transfer](../interop/asset-transfer.md)): augmentation of `simpleasset` with asset pledging, claiming, and reclaiming features for cross-network transfers.

_Note_: for new users, we recommend testing the Data Sharing feature first with the `simplestate` contract. To test the other modes, you can simply [tear down](#tear-down-the-setup) the Fabric networks and restart them with the appropriate chaincodes installed.

Follow the instructions below to build and launch the networks:
- Navigate to the `tests/network-setups/fabric/dev` folder.
- To spin up both network1 and network2 with the interoperation chaincode and the default `simplestate` chaincode installed, run:
  ```bash
  make start-interop-local
  ```
- _To launch the networks with a different application chaincode from the above list, run_:
  ```bash
  make start-interop-local CHAINCODE_NAME=<chaincode-name>
  ```
- (_Note_: If you do not wish to test Fabric-Fabric interoperation, you can choose to install only one of the two networks along with its interoperation chaincode. For `network1`, run `make start-interop-network1-local`, and for `network2`, run `make start-interop-network2-local`.)

For more information, refer to the associated [README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/fabric/dev).

**Troubleshooting Tips**:
- If you see any errors during the launches, re-check the prerequisites (software installations and credentials). Ensure your network connection is working. As a safe bet, you can retry after cleanup: kill and remove all Docker containers and associated volumes.
- If `protoc` or `protoc-gen-go` throws an error, reinstall `protoc` and `protoc-gen-go` using suggestions made in the Prerequisites section above.

### Fabric Client (fabric-cli)

The CLI is used to interact with a Fabric network, configure it and run chaincode transactions to record data on the channel ledger or query data. It is also used to interact with remote networks through the relay to trigger an interoperation flow for data request and acceptance.

The `fabric-cli` Node.js source code is located in the `samples/fabric/fabric-cli` folder and the Golang source code in the `samples/fabric/go-cli` folder.

#### Prerequisites

If you are using a Linux system, make sure that lib64 is installed.

_Note_: For the Node.js version of the `fabric-cli`, the setup and running instructions below were tested with all Node.js versions from v11.14.0 to v14.17.3.

#### Installation

You can install `fabric-cli` as follows (for both the Node.js and Golang versions):
- Navigate to the `samples/fabric/fabric-cli` folder or the `samples/fabric/go-cli` folder.
- Run the following to install dependencies (for the Node.js version) or the executable (for the Golang version):
  ```bash
  make build-local
  ```
- Use the `fabric-cli` executable in the `bin` folder for [subsequent actions](./ledger-initialization.md).

### Fabric Relay

The relay is a module acting on behalf of a network, enabling interoperation flows with other networks by communicating with their relays.
The code for this lies in the `core/relay` folder.

#### Building

_Prerequisite_: make sure Rust is already installed and that the `cargo` executable is in your system path (after installation of Rust, this should be available in `$HOME/.cargo/bin`); you can also ensure this by running `source "$HOME/.cargo/env"`.

Build the generic (i.e., common to all DLTs) relay module as follows:
- Navigate to the `core/relay` folder.
- Run the following:
  ```bash
  make
  ```

#### Deployment

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

A driver is a DLT-specific plugin invoked by the relay while conveying external data queries to the local peer network and collecting a response with proofs. The Fabric driver is built as a Fabric client application on the `fabric-network` NPM package.
The code for this lies in the `core/drivers/fabric-driver` folder.

#### Configuring

In the `core/drivers/fabric-driver` folder, copy `.env.template` to `.env` and update `CONNECTION_PROFILE` to point to the connection profile of the fabric network (e.g. `<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json`)

Configure `fabric-driver` for `network1` as follows:
- Navigate to the `core/drivers/fabric-driver` folder.
- Create a `.env` file by copying `.env.template` and setting suitable parameter values:
  * The `CONNECTION_PROFILE` should point to the absolute path of the connection profile for `network1`.
    - For this exercise, specify the path `<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json` (_you must specify the full absolute path here_).
    - `<PATH-TO-WEAVER>` here is the absolute path of the `weaver-dlt-interoperability` clone folder.
  * Leave the default values unchanged for the other parameters. The relay and driver endpoints as well as the network name are already specified.

#### Building

Build the Fabric driver module as follows:
- Navigate to the `core/drivers/fabric-driver` folder.
- Run the following:
  ```bash
  make build-local
  ```

#### Running

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

### Interoperation Cordapp

The interoperation Cordapp is deployed to run as part of any Corda application flow that involves cross-network interoperation.

Build the interoperation Cordapp as follows:
- Navigate to the `core/network/corda-interop-app` folder.
- Run the following to create the JAR files on which other Corda network components will depend on:
  ```bash
  make build-local
  ```
  
### Corda Interoperation SDK

A client-layer library is defined in the `sdks/corda` folder. This contains functions for Corda based client applications to exercise interoperation capabilities via relays and also several utility/helper functions. The Corda Client tool, which we will use later, depends on this library.

To build the library, do the following:
- Navigate to the `sdks/corda` folder.
- Run the following command (_make sure there is no github.properties file present in the directory_):
  ```bash
  make build
  ```

### Corda Simple Application and Client (Application)

This is a simple Cordapp that maintains a state of type `SimpleState`, which is a set of key-value pairs (of strings).
The code for this lies in the `samples/corda/corda-simple-application` folder.

Build the `corda-simple-application` Cordapp as follows:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  ```bash
  make build-local
  ```

### Corda Network

The Corda network code lies in the `tests/network-setups/corda` folder. You can launch a network consisting of one node (`PartyA`) and one notary. This network uses `samples/corda/corda-simple-application` which maintains a state of type `SimpleState`, which is a set of key-value pairs (of strings).

Follow the instructions below to build and launch the network:
- Navigate to the `tests/network-setups/corda` folder.
- To spin up the Corda network with the interoperation Cordapp, run:
    ```bash
    make start-local
    ```

If the Corda node and notary start up successfully, you should something like the following:

![Corda network startup screenshot](/setup-assets/Corda_network.jpg)

It's safe to press `Ctrl-C` here, as what you are seeing are the container logs.

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

#### Building Corda Driver

Build the Corda driver module as follows:
- Navigate to the `core/drivers/corda-driver` folder.
- Run the following:
  ```bash
  make build-local
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

## Tear Down the Setup

Bring down the test network's components as follows:
- Simply terminate the various relays and drivers, which are running in the foreground in different terminals
- To bring down the running Corda network:
  * Navigate to the `tests/network-setups/corda` folder.
  * Run the following:
  ```bash
  make clean
  ```
- To bring down all the running Fabric networks:
  * Navigate to the `tests/network-setups/fabric/dev` folder.
  * Run the following:
  ```bash
  make clean
  ```

