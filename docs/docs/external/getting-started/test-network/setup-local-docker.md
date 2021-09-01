---
id: setup-local-docker
title: Setup with Locally Built Dockerized Weaver Components
---

<!--
Copyright IBM Corp. All Rights Reserved.

SPDX-License-Identifier: CC-BY-4.0
-->

In this document, we detail the steps using which you can bring up networks using the default configuration settings and by fetching pre-built Weaver interoperation modules, SDK libraries, and relay docker image, drivers docker images from Github Package repositories. To customize these settings (e.g., hostnames, ports), refer to the [Advanced Configuration page](./advanced-configuration.md).

_Note_: All components are run within Docker containers, except client applications.

Follow the instructions below to build and run components followed by interoperation flows. These instructions have been tested on Ubuntu Linux (bash shell) and Mac OS. In general, they should work on any system and shell as long as the various dependencies have been installed and configured.

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

Using the sequence of instructions below, you can start two separate Fabric networks, each with a single channel and application contract (chaincode). You can also start an interoperation contract, a relay and a _driver_ acting on behalf of each network. You can build a Fabric CLI tool with which you can initialize both networks' ledgers with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample key-value pairs that can be shared during subsequent interoperation flows.

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
- Single contract named `simplestate` (deployed on `mychannel`) that supports simple transactions (`Create`, `Read`, `Update`, `Delete`) involving storage and lookup of <key, value> pairs.

Follow the instructions below to build and launch the networks:
- Navigate to the `tests/network-setups/fabric/dev` folder.
- To spin up both network1 and network2 with interoperation chaincode installed, run:
  ```
  make start-interop-local
  ```

For more information, refer to the associated [README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/fabric/dev).

**Troubleshooting Tips**:
- If you see any errors during the launches, re-check the prerequisites (software installations and credentials). Ensure your network connection is working. As a safe bet, you can retry after cleanup: kill and remove all Docker containers and associated volumes.
- If `protoc` or `protoc-gen-go` throws an error, reinstall `protoc` and `protoc-gen-go` using suggestions made in the Prerequisites section above.

### Fabric Relay

The relay is a module acting on behalf of a network, enabling interoperation flows with other networks by communicating with their relays.
The code for this lies in the `core/relay` folder. Navigate to the `core/relay` folder.

#### Building Relay Image

To build the docker image for relay, run:
```bash
make build-server-local
```

#### Deployment

* Run: `make convert-compose-method2` to uncomment and comment some lines in `docker-compose.yaml`.
* For `network1`, there's `.env.n1` file in `docker/testnet-envs` directory, that will be used to start a relay server in docker. Edit the file, and update the following value:
  ```
  DOCKER_IMAGE_NAME=weaver-relay-server
  ```
* Repeat above step for `.env.n2` file in `docker/testnet-envs` directory, that will be used to start relay server for `network2` in docker.
* To deploy relay server for `network1`, run:
  ```bash
  make start-server COMPOSE_ARG='--env-file docker/testnet-envs/.env.n1'
  ```
* For `network2`, there's `.env.n2` file in `docker/testnet-envs` directory, that will be used to start a relay server in docker. 
* To deploy relay server for `network2`, run:
  ```bash
  make start-server COMPOSE_ARG='--env-file docker/testnet-envs/.env.n2'
  ```

For more information, see the [relay-docker README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/relay/relay-docker.md).

### Fabric Driver

A driver is a DLT-specific plugin invoked by the relay while channelling external data queries to the local peer network and collecting a response with proofs. The Fabric driver is built as a Fabric client application on the `fabric-network` NPM package.
The code for this lies in the `core/drivers/fabric-driver` folder. Navigate to the `core/drivers/fabric-driver` folder.

#### Building

To build the fabric-driver image, run:
```bash
make build-image-local
```

#### Deployment

Following steps demonstrate how to run a fabric driver in docker container (_replace `<PATH-TO-WEAVER>` with location of the clone of your weaver_).
* For `network1`, there's `.env.n1` file in `docker-testnet-envs` directory, that will be used to start a fabric driver in docker. 
  - Edit that file and replace `<PATH-TO-WEAVER>` with the absolute path of the `weaver-dlt-interoperability` clone folder.
  - Update the following value:
    ```
    DOCKER_IMAGE_NAME=weaver-fabric-driver
    ```
* Repeat above step for `.env.n2` file in `docker-testnet-envs` directory, that will be used to start fabric driver for `network2` in docker.
* To deploy fabric driver for `network1`, run:
  ```bash
  make deploy COMPOSE_ARG='--env-file docker-testnet-envs/.env.n1'
  ```
* To deploy fabric driver for `network2`, run:
  ```bash
  make deploy COMPOSE_ARG='--env-file docker-testnet-envs/.env.n2'
  ```

### Fabric Client (Application)

The CLI is used to interact with a Fabric network, configure it and run chaincode transactions to record data on the channel ledger or query data. It is also used to interact with remote networks through the relay in order to trigger an interoperation flow for data request and acceptance.

The `fabric-cli` source code is located in the `samples/fabric/fabric-cli` folder.

#### Prerequisites

If you are using a Linux system, make sure that lib64 is installed.

_Note_: The setup and running instructions below were tested with all Node.js versions from v11.14.0 to v14.17.3.

#### Installation

You can install `fabric-cli` as follows:
- Navigate to the `samples/fabric/fabric-cli` folder.
- Run the following to install dependencies:
  ```bash
  make build-local
  ```
- Use the `fabric-cli` executable in the `bin` folder for [subsequent actions](./ledger-initialization.md).

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
Following steps will build above cordapp and a corda-client as well in `samples/corda/client`.

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

Navigate to the `core/relay` folder. Refer [here](#building-relay-image) to build the relay image if not already built. Now run a relay for `Corda_Network` in docker as follows:

* Run: `make convert-compose-method2` to uncomment and comment some lines in `docker-compose.yaml`.
* There's `.env.corda` file in `docker/testnet-envs` directory, that will be used to start a relay server in docker. Edit the file, and modify following values:
  ```
  DOCKER_IMAGE_NAME=weaver-relay-server
  ```
* To deploy, run:
  ```bash
  make start-server COMPOSE_ARG='--env-file docker/testnet-envs/.env.corda'
  ```

### Corda Driver

Navigate to the `core/drivers/corda-driver` folder.

#### Building

To build the corda driver docker image, run:
```bash
make image-local
```

#### Deployment

Run a Corda driver as follows:
- There's a `.env.corda` file in `docker-testnet-envs` directory, that will be used to start a corda driver in docker. Edit the file and update the following value:
  ```
  DOCKER_IMAGE_NAME=weaver-corda-driver
  ```
- To deploy, run:
  ```bash
  make deploy COMPOSE_ARG='--env-file docker-testnet-envs/.env.corda'
  ```

If the driver starts successfully, it should log the following message, when you run `docker logs corda-driver-Corda_Network`:
```
Corda driver gRPC server started. Listening on port 9099
```

## Tear Down the Setup

Bring down the various components as follows (_Navigate to the root folder of weaver_):

### Relay
To bring down the relays (for all 3 networks), run:
```bash
cd core/relay
make stop COMPOSE_ARG='--env-file .env.n1'
make stop COMPOSE_ARG='--env-file .env.n2'
make stop COMPOSE_ARG='--env-file .env.corda'
cd -
```

### Fabric Driver
To bring down the fabric drivers (for both networks), run:
```bash
cd core/drivers/fabric-driver
make stop COMPOSE_ARG='--env-file .env.n1'
make stop COMPOSE_ARG='--env-file .env.n2'
cd -
```

### Corda Driver
To bring down the corda driver, run:
```bash
cd core/drivers/corda-driver
make stop
cd -
```

### Corda Network
To bring down the Corda network:
```bash
cd tests/network-setups/corda
make clean
cd -
```

### Fabric Network
To bring down both of the Fabric networks along with weaver components:
```bash
cd tests/network-setups/fabric/dev
make clean
cd -
```