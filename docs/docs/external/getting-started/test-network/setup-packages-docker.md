---
id: setup-packages-docker
title: Setup with Imported Dockerized Weaver Components
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

### Credentials
Make sure you have an SSH or GPG key registered in https://github.com to allow seamless cloning of repositories (at present, various setup scripts clone repositories using the `https://` prefix but this may change to `git@` in the future).

#### Package Access Token:
Create a personal access token with `read:packages` access in github in order to use modules published in github packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.

Run `docker login ghcr.io`,  and provide github email id as username and personal access token created above as password. This will allow the docker to fetch images of `relay`, `fabric-driver` and `corda-driver` from `hyperledger-labs/weaver-dlt-interoperability`.

## Getting the Code and Documentation

Clone the [weaver-dlt-interoperability](https://github.com/hyperledger-labs/weaver-dlt-interoperability) repository. The code to get a basic test network up and running and test data-sharing interoperation flows lies in the subfolder `tests/network-setups`, which should be your starting point, though the setups will rely on other parts of the repository, as you will find out in the instructions given on this page.

## Hyperledger Fabric Components

Using the sequence of instructions below, you can start two separate Fabric networks, each with a single channel and application contract (chaincode). You can also start an interoperation contract, a relay and a _driver_ acting on behalf of each network. You can build a Fabric CLI tool with which you can initialize both networks' ledgers with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample key-value pairs that can be shared during subsequent interoperation flows.

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
  make start-interop
  ```
- _To launch the networks with a different application chaincode from the above list, run_:
  ```bash
  make start-interop CHAINCODE_NAME=<chaincode-name>
  ```
- (_Note_: If you do not wish to test Fabric-Fabric interoperation, you can choose to install only one of the two networks along with its interoperation chaincode. For `network1`, run `make start-interop-network1`, and for `network2`, run `make start-interop-network2`.)

For more information, refer to the associated [README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/fabric/dev).

**Troubleshooting Tips**:
- If you see any errors during the launches, re-check the prerequisites (software installations and credentials). Ensure your network connection is working. As a safe bet, you can retry after cleanup: kill and remove all Docker containers and associated volumes.

### Fabric Relay

The relay is a module acting on behalf of a network, enabling interoperation flows with other networks by communicating with their relays.
The code for this lies in the `core/relay` folder.

Navigate to the `core/relay` folder and run a relay as follows:

* Run: `make convert-compose-method2` to uncomment and comment some lines in `docker-compose.yaml`.
* For `network1`, there's `.env.n1` file in `docker/testnet-envs` directory, that will be used to start a relay server in docker. To deploy, run:
 ```bash
 make start-server COMPOSE_ARG='--env-file docker/testnet-envs/.env.n1'
 ```
 * For `network2`, there's `.env.n2` file in `docker/testnet-envs` directory, that will be used to start a relay server in docker. To deploy, run:
 ```bash
 make start-server COMPOSE_ARG='--env-file docker/testnet-envs/.env.n2'
 ```

For more information, see the [relay-docker README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/relay/relay-docker.md).

### Fabric Driver

A driver is a DLT-specific plugin invoked by the relay while channelling external data queries to the local peer network and collecting a response with proofs. The Fabric driver is built as a Fabric client application on the `fabric-network` NPM package.
The code for this lies in the `core/drivers/fabric-driver` folder.

Following steps demonstrate how to run a fabric driver in docker container (_replace `<PATH-TO-WEAVER>` with location of the clone of your weaver_).
- Navigate to the `core/drivers/fabric-driver` folder.
- For `network1`, there's `.env.n1` file in `docker-testnet-envs` directory, that will be used to start a fabric driver in docker. Edit that file and replace `<PATH-TO-WEAVER>` with the absolute path of the `weaver-dlt-interoperability` clone folder.
- Repeat above step for `.env.n2` file in `docker-testnet-envs` directory, that will be used to start fabric driver for `network2` in docker.
- To deploy fabric driver for `network1`, run:
 ```bash
 make deploy COMPOSE_ARG='--env-file docker-testnet-envs/.env.n1'
 ```
- To deploy fabric driver for `network2`, run:
 ```bash
 make deploy COMPOSE_ARG='--env-file docker-testnet-envs/.env.n2'
 ```
 
### Fabric Client (Application)

The CLI is used to interact with a Fabric network, configure it and run chaincode transactions to record data on the channel ledger or query data. It is also used to interact with remote networks through the relay in order to trigger an interoperation flow for data request and acceptance.

The `fabric-cli` Node.js source code is located in the `samples/fabric/fabric-cli` folder and the Golang source code in the `samples/fabric/go-cli` folder.

#### Prerequisites

If you are using a Linux system, make sure that lib64 is installed.

_Note_: For the Node.js version of the `fabric-cli`, the setup and running instructions below were tested with all Node.js versions from v11.14.0 to v14.17.3.

#### Installation

You can install `fabric-cli` as follows (for both the Node.js and Golang versions):
- Navigate to the `samples/fabric/fabric-cli` folder or the `samples/fabric/go-cli` folder.
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created [above](#package-access-token)..
- Run the following to install dependencies (for the Node.js version) or the executable (for the Golang version):
  ```bash
  make build
  ```
- Use the `fabric-cli` executable in the `bin` folder for [subsequent actions](./ledger-initialization.md).

## Corda Components

Using the sequence of instructions below, you can start a Corda network and run an application Cordapp on it. You can also run an interoperation Cordapp, a relay and a _driver_ acting on behalf of the network. You can initialize the network's vault with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample state values that can be shared during subsequent interoperation flows.

### Corda Network

The Corda network code lies in the `tests/network-setups/corda` folder. You can launch a network consisting of one node (`PartyA`) and one notary. This network uses `samples/corda/corda-simple-application` which maintains a state of type `SimpleState`, which is a set of key-value pairs (of strings).
Following steps will build above cordapp and a corda-client as well in `samples/corda/client`.

#### Running with Interoperation Cordapp from Github Packages

Follow the instructions below to build and launch the network:
- Navigate to the `tests/network-setups/corda` folder.
- Create copy of `github.properties.template` as `github.properties`.
- Replace `<GITHUB email>` with your github email, and `<GITHUB Personal Access Token>` with the access token created [above](#package-access-token).
- To spin up the Corda network with the interoperation Cordapp, run:
 ```bash
 make start
 ```

If the Corda node and notary start up successfully, you should something like the following:

![Corda network startup screenshot](/setup-assets/Corda_network.jpg)

It's safe to press `Ctrl-C` here, as what you are seeing are the container logs.

### Corda Relay

Navigate to the `core/relay` folder and run a relay for `Corda_Network` in docker as follows:
* Run: `make convert-compose-method2` to uncomment and comment some lines in `docker-compose.yaml`.
* There's `.env.corda` file in `docker/testnet-envs` directory, that will be used to start a relay server in docker. To deploy, run:
 ```bash
 make start-server COMPOSE_ARG='--env-file docker/testnet-envs/.env.corda'
 ```

### Corda Driver

Run a Corda driver as follows:
- Navigate to the `core/drivers/corda-driver` folder.
- There's a `.env.corda` file in `docker-testnet-envs` directory, that will be used to start a corda driver in docker. To deploy, run:
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
make stop COMPOSE_ARG='--env-file docker/testnet-envs/.env.n1'
make stop COMPOSE_ARG='--env-file docker/testnet-envs/.env.n2'
make stop COMPOSE_ARG='--env-file docker/testnet-envs/.env.corda'
cd -
```

### Fabric Driver
To bring down the fabric drivers (for both networks), run:
```bash
cd core/drivers/fabric-driver
make stop COMPOSE_ARG='--env-file docker-testnet-envs/.env.n1'
make stop COMPOSE_ARG='--env-file docker-testnet-envs/.env.n2'
cd -
```

### Corda Driver
To bring down the corda driver, run:
```bash
cd core/drivers/corda-driver
make stop COMPOSE_ARG='--env-file docker-testnet-envs/.env.corda'
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
