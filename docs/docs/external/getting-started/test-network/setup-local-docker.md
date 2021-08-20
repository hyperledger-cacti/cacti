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

### Fabric Relay

The relay is a module acting on behalf of a network, enabling interoperation flows with other networks by communicating with their relays.
The code for this lies in the `core/relay` folder. Navigate to the `core/relay` folder.

#### Building Relay Image

Run `make build-server-local` to build the docker image for relay.

#### Deployment

Navigate to the `core/relay` folder and run a relay as follows:

* Run: `make convert-compose-method2` to uncomment and comment some lines.
* For `network1`, create a `.env.n1` file by copying `.env.template` and set values as (_Values are given wrt our testnet deployed completely in docker_):
```
PATH_TO_REMOTE_RELAYS_DEFINITIONS=./docker/remote-relay-dns-config
NETWORK_NAME=network1
NETWORK_TYPE=Fabric
DRIVER_HOST=fabric-driver-network1
DRIVER_PORT=9090
DRIVER_NAME=fabric-driver-network1
RELAY_NAME=relay-network1
RELAY_PORT=9080
DOCKER_IMAGE_NAME=weaver-relay-server
DOCKER_TAG=1.2.1
EXTERNAL_NETWORK=network1_net
COMPOSE_PROJECT_NAME=network1
COMPOSE_PROJECT_NETWORK=net
```
* For `network2`, create a `.env.n2` file by copying `.env.template` and set values as:
```
PATH_TO_REMOTE_RELAYS_DEFINITIONS=./docker/remote-relay-dns-config
NETWORK_NAME=network2
NETWORK_TYPE=Fabric
DRIVER_HOST=fabric-driver-network2
DRIVER_PORT=9095
DRIVER_NAME=fabric-driver-network2
RELAY_NAME=relay-network2
RELAY_PORT=9083
DOCKER_IMAGE_NAME=weaver-relay-server
DOCKER_TAG=1.2.1
EXTERNAL_NETWORK=network2_net
COMPOSE_PROJECT_NAME=network2
COMPOSE_PROJECT_NETWORK=net
```
* To deploy the relay for `network1`, run:
```bash
make start-server COMPOSE_ARG='--env-file .env.n1'
```
* To deploy the relay for `network2`, run:
```bash
make start-server COMPOSE_ARG='--env-file .env.n2'
```

For more information, see the [relay-docker README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/relay/relay-docker.md).

### Fabric Driver

A driver is a DLT-specific plugin invoked by the relay while channelling external data queries to the local peer network and collecting a response with proofs. The Fabric driver is built as a Fabric client application on the `fabric-network` NPM package.
The code for this lies in the `core/drivers/fabric-driver` folder. Navigate to the `core/drivers/fabric-driver` folder.

#### Building

* Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created [above](#package-access-token)..
* Run `make build-image` to build the fabric-driver image.

#### Deployment

Following steps demonstrate how to run a fabric driver in docker container (_replace `<PATH-TO-WEAVER>` with location of the clone of your weaver_).
- For `network1`, create a `.env.n1` file by copying `.env.docker.template` and set values as:
```
CONNECTION_PROFILE=<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.docker.json
DRIVER_CONFIG=./config.json
RELAY_ENDPOINT=relay-network1:9080
NETWORK_NAME=network1
DRIVER_PORT=9090
INTEROP_CHAINCODE=interop
DOCKER_IMAGE_NAME=weaver-fabric-driver
DOCKER_TAG=1.2.1
EXTERNAL_NETWORK=network1_net
COMPOSE_PROJECT_NAME=network1
COMPOSE_PROJECT_NETWORK=net
```
- For `network2`, create a `.env.n2` file by copying `.env.docker.template` and set values as:
```
CONNECTION_PROFILE=<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network2/peerOrganizations/org1.network2.com/connection-org1.docker.json
DRIVER_CONFIG=./config.json
RELAY_ENDPOINT=relay-network2:9083
NETWORK_NAME=network2
DRIVER_PORT=9095
INTEROP_CHAINCODE=interop
DOCKER_IMAGE_NAME=weaver-fabric-driver
DOCKER_TAG=1.2.1
EXTERNAL_NETWORK=network2_net
COMPOSE_PROJECT_NAME=network2
COMPOSE_PROJECT_NETWORK=net
```
- Run following to start the fabric-driver for `network1`:
```bash
make deploy COMPOSE_ARG='--env-file .env.n1'
```
- Run following to start the fabric-driver for `network2`:
```bash
make deploy COMPOSE_ARG='--env-file .env.n2'
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
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created [above](#package-access-token)..
- Run the following to install dependencies:
```bash
npm install
```
- Use the `fabric-cli` executable in the `bin` folder for subsequent actions.

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

### Corda Relay

Navigate to the `core/relay` folder. Refer [here](#building-relay-image) to build the relay image if not already built. Now run a relay for `Corda_Network` in docker as follows:

* Run: `make convert-compose` to uncomment and comment some lines.
* Copy `.env.template.2` file to `.env.corda`.
* Update following Environment Variables in `.env.corda` (_Values are given wrt our testnet deployed completely in docker_) :
```
PATH_TO_REMOTE_RELAYS_DEFINITIONS=./docker/remote-relay-dns-config
NETWORK_NAME=Corda_Network
NETWORK_TYPE=Corda
DRIVER_HOST=corda-driver-Corda_Network
DRIVER_PORT=9099
DRIVER_NAME=corda-driver-Corda_Network
RELAY_NAME=relay-corda
RELAY_PORT=9081
DOCKER_IMAGE_NAME=weaver-relay-server
DOCKER_TAG=1.2.1
EXTERNAL_NETWORK=corda_default
COMPOSE_PROJECT_NAME=corda
COMPOSE_PROJECT_NETWORK=default
```
* To deploy the relay, run:
```bash
make start-server COMPOSE_ARG='--env-file .env.corda'
```

### Corda Driver

Navigate to the `core/drivers/corda-driver` folder.

#### Building

* Create copy of `github.properties.template` as `github.properties`.
* Replace `<GITHUB email>` with your github email, and `<GITHUB Personal Access Token>` with the access token created [above](#package-access-token).
* Run `make image` to build the corda driver docker image.

#### Deployment

Run a Corda driver as follows:
- Create a `.env` file by copying `.env.docker.template` and set values as:
```
NETWORK_NAME=Corda_Network
DRIVER_PORT=9099
DOCKER_IMAGE_NAME=weaver-corda-driver
DOCKER_TAG=1.2.3
EXTERNAL_NETWORK=corda_default
COMPOSE_PROJECT_NAME=corda
COMPOSE_PROJECT_NETWORK=default
```
- To start the corda driver, run:
```bash
make deploy
```

If the driver starts successfully, it should log the following message:
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