---
id: setup-packages
title: Setup with Imported Weaver Components
pagination_prev: external/getting-started/test-network/overview
pagination_next: external/getting-started/test-network/ledger-initialization
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

In this document, we detail the steps using which you can bring up networks using the default configuration settings and by fetching pre-built Weaver interoperation modules, SDK libraries, and relay drivers from GitHub Package repositories. To customize these settings (e.g., hostnames, ports), refer to the [Advanced Configuration page](./advanced-configuration.md).

| Notes |
|:------|
| The default configuration is for a development setup, therefore all components are run on `localhost`, many within Docker containers. |

Follow the instructions below to build and run components followed by interoperation flows. These instructions have been tested on Ubuntu Linux (bash shell) and Mac OS. In general, they should work on any system and shell as long as the various dependencies have been installed and configured.

## Prerequisites

### Software
Before starting, make sure you have the following software installed on your host machine:
- Curl: _install using package manager, like `apt` on Debian/Ubuntu Linux_
- Git: [sample instructions](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- Docker: [sample instructions](https://docs.docker.com/engine/install/) (Latest version)
- Docker-Compose: [sample instructions](https://docs.docker.com/compose/install/) (Version 1.28.2 or higher, but lower than version V2)
- Golang: [sample instructions](https://golang.org/dl/) (Version 1.16 or higher)
- Java (JDK and JRE): [sample instructions](https://openjdk.java.net/install/) (Version 8)
- Node.js and NPM: [sample instructions](https://nodejs.org/en/download/package-manager/) (Version 16 Supported)
- Yarn: [sample instructions](https://classic.yarnpkg.com/en/docs/install/)
- Rust: [sample instructions](https://www.rust-lang.org/tools/install)
  * To avoid errors during Weaver Relay compilation, update certain packages (on which the Weaver Relay is dependent) to their latest versions as follows:
    ```
    cargo update -p nom
    cargo update -p lexical-core
    ```

### Credentials
Make sure you have an SSH or GPG key registered in https://github.com to allow seamless cloning of repositories (at present, various setup scripts clone repositories using the `https://` prefix but this may change to `git@` in the future).

Create a personal access token with `read:packages` access in GitHub in order to use modules published in GitHub packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.

## Getting the Code and Documentation

Clone the [cacti](https://github.com/hyperledger/cacti) repository. The code to get a basic test network up and running and test data-sharing interoperation flows lies in the subfolder `weaver/tests/network-setups`, which should be your starting point, though the setups will rely on other parts of the repository, as you will find out in the instructions given on this page.

## Securing Components

| Notes |
|:------|
| The relays and drivers corresponding to the different test networks you will encounter below can be run with or without TLS enabled. But the default files used in the demonstrations assume that either all relays and drivers are TLS-enabled or none are. Therefore, you should determine at the outset whether or not you wish to run the entire set of components in TLS-enabled mode, and select appropriate commands in the provided instructions. |

## Hyperledger Fabric Components

Using the sequence of instructions below, you can start two separate Fabric networks, each with a single channel and application contract (chaincode). You can also start an interoperation contract, a relay, and a _driver_ acting on behalf of each network. You can build a Fabric CLI tool with which you can initialize both networks' ledgers with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample key-value pairs that can be shared during subsequent interoperation flows.

### Fabric Network

The code for this lies in the `weaver/tests/network-setups` folder.

This folder contains code to create and launch networks `network1` and `network2` of identical specifications:
- Network: 1 peer, 1 peer CA, 1 ordering service node, 1 ordering service CA
- Single channel named `mychannel`
- One of the following contracts deployed on `mychannel`, the choice depending on the [interoperability mode](../../interoperability-modes.md) you wish to test:
  * `simplestate` ([Data Sharing](../interop/data-sharing.md)): supports simple transactions (`Create`, `Read`, `Update`, `Delete`) involving storage and lookup of <key, value> pairs.
  * `simplestatewithacl` ([Data Sharing](../interop/data-sharing.md)): identical to `simplestate` but with extra security features to ensure that the Weaver infrastructure cannot be bypassed by a malicious client of the network.
  * `simpleasset` ([Asset Exchange](../interop/asset-exchange/overview.md)): supports creation, modification, transfer, and deletion, as well as locking, unlocking, and claiming, of simple bonds and tokens (examples of non-fungible and fungible assets respectively).
  * `simpleassetandinterop` ([Asset Exchange](../interop/asset-exchange/overview.md)): identical to `simpleasset` but where the locking, unlocking, and claiming logic is imported as a library in the chaincode rather than available in the common Fabric Interoperation Chaincode (a Weaver component).
  * `simpleassettransfer` ([Asset Exchange](../interop/asset-exchange/overview.md) or [Asset Transfer](../interop/asset-transfer.md)): augmentation of `simpleasset` with asset pledging, claiming, and reclaiming features for cross-network transfers.

| Notes |
|:------|
| For new users, we recommend testing the Data Sharing feature first with the `simplestate` contract. To test the other modes, you can simply [tear down](#tear-down-the-setup) the Fabric networks and restart them with the appropriate chaincodes installed. |

Follow the instructions below to build and launch the networks:
- Navigate to the `weaver/tests/network-setups/fabric/dev` folder.
- To spin up both network1 and network2 with the interoperation chaincode and the default `simplestate` chaincode installed, run:
  ```bash
  make start-interop
  ```
- _To launch the networks with a different application chaincode from the above list, run_:
  ```bash
  make start-interop CHAINCODE_NAME=<chaincode-name>
  ```
- _To launch the networks with 2 organizations, each with a peer (this will enable more variation and experimentation, which you can attempt after testing interoperation protocols across basic network configurations), run_:
  ```bash
  make start-interop-local PROFILE="2-nodes"
  ```

| Notes |
|:------|
| If you do not wish to test Fabric-Fabric interoperation, you can choose to launch only one of the two networks along with its interoperation chaincode. For `network1`, run `make start-interop-network1`, and for `network2`, run `make start-interop-network2` |
| If you wish to enable end-to-end confidentiality by default in the interoperation modules that are deployed during network launch, set the environment variable `E2E_CONFIDENTIALITY` to `true` in the command line as follows: `E2E_CONFIDENTIALITY=true make start-interop` |

For more information, refer to the associated [README](https://github.com/hyperledger/cacti/tree/main/weaver/tests/network-setups/fabric/dev).

**Troubleshooting Tips**:
- If you see any errors during the launches, re-check the prerequisites (software installations and credentials). Ensure your network connection is working. As a safe bet, you can retry after cleanup: kill and remove all Docker containers and associated volumes.

### Fabric Client (fabric-cli)

The CLI is used to interact with a Fabric network, configure it and run chaincode transactions to record data on the channel ledger or query data. It is also used to interact with remote networks through the relay to trigger an interoperation flow for data request and acceptance.

The `fabric-cli` Node.js source code is located in the `weaver/samples/fabric/fabric-cli` folder and the Golang source code in the `weaver/samples/fabric/go-cli` folder.

#### Prerequisites

If you are using a Linux system, make sure that lib64 is installed.

| Notes |
|:------|
| For the Node.js version of the `fabric-cli`, the setup and running instructions below were tested with all Node.js versions from v11.14.0 to v14.17.3. |

#### Installation

You can install `fabric-cli` as follows (for both the Node.js and Golang versions):
- Navigate to the `weaver/samples/fabric/fabric-cli` folder (for the Node.js version) or the `weaver/samples/fabric/go-cli` (for the Golang version) folder.
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created [above](#package-access-token)..
- Run the following to install dependencies (for the Node.js version) or the executable (for the Golang version):
  ```bash
  make build
  ```
- Use the `fabric-cli` executable in the `bin` folder for [subsequent actions](./ledger-initialization.md).

### Fabric Relay

The relay is a module acting on behalf of a network, enabling interoperation flows with other networks by communicating with their relays.
The code for this lies in the `weaver/core/relay` folder.

#### Building

_Prerequisite_: make sure Rust is already installed and that the `cargo` executable is in your system path (after installation of Rust, this should be available in `$HOME/.cargo/bin`); you can also ensure this by running `source "$HOME/.cargo/env"`.

Build the generic (i.e., common to all DLTs) relay module as follows:
- Navigate to the `weaver/core/relay` folder.
- Run the following:
  ```bash
  make
  ```
- If you observe errors during the above compilation, update certain packages (on which the Weaver Relay is dependent) to their latest versions and recompile as follows:
  ```bash
  make update-pkgs
  make
  ```

#### Deployment

An instance or a relay can be run using a suitable configuration file. Samples are available in the `weaver/core/relay/config` folder.

Run a relay for `network1` as follows:
- Navigate to the `weaver/core/relay` folder.
- To launch the server without TLS, leave the configuration file `config/Fabric_Relay.toml` in its default state. Otherwise, edit it to set TLS flags for this relay and the other relays and drivers it will connect to in this demonstration as follows:
  ```toml
  .
  .
  cert_path="credentials/fabric_cert.pem"
  key_path="credentials/fabric_key"
  tls=true
  .
  .
  [relays]
  [relays.Corda_Relay]
  hostname="localhost"
  port="9081"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Corda_Relay2]
  hostname="localhost"
  port="9082"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Fabric_Relay2]
  hostname="localhost"
  port="9083"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  [drivers]
  [drivers.Fabric]
  hostname="localhost"
  port="9090"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  ```
- To launch the server, simply run the following:
  ```bash
  RELAY_CONFIG=config/Fabric_Relay.toml cargo run --bin server
  ```

Run a relay for `network2` as follows (_do this only if you have launched both Fabric networks `network1` and `network2` and wish to test interoperation between them_)
- Navigate to the `weaver/core/relay` folder.
- To launch the server without TLS, leave the configuration file `config/Fabric_Relay2.toml` in its default state. Otherwise, edit it to set TLS flags for this relay and the other relays and drivers it will connect to in this demonstration as follows:
  ```toml
  .
  .
  cert_path="credentials/fabric_cert.pem"
  key_path="credentials/fabric_key"
  tls=true
  .
  .
  [relays]
  [relays.Corda_Relay]
  hostname="localhost"
  port="9081"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Corda_Relay2]
  hostname="localhost"
  port="9082"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Fabric_Relay]
  hostname="localhost"
  port="9080"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  [drivers]
  [drivers.Fabric]
  hostname="localhost"
  port="9095"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  ```
- To launch the server, simply run the following:
  ```bash
  RELAY_CONFIG=config/Fabric_Relay2.toml cargo run --bin server
  ```

For more information, see the [relay README](https://github.com/hyperledger/cacti/tree/main/weaver/core/relay).


### Fabric Driver

A driver is a DLT-specific plugin invoked by the relay while conveying external data queries to the local peer network and collecting a response with proofs. The Fabric driver is built as a Fabric client application on the `fabric-network` NPM package.
The code for this lies in the `weaver/core/drivers/fabric-driver` folder.

#### Configuring

In the `weaver/core/drivers/fabric-driver` folder, copy `.env.template` to `.env` and update `CONNECTION_PROFILE` to point to the connection profile of the Fabric network (e.g. `<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json`)

Configure `fabric-driver` for `network1` as follows:
- Navigate to the `weaver/core/drivers/fabric-driver` folder.
- Create a `.env` file by copying `.env.template` and setting suitable parameter values:
  * The `CONNECTION_PROFILE` should point to the absolute path of the connection profile for `network1`.
    - For this exercise, specify the path `<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json` (_you must specify the full absolute path here_).
    - `<PATH-TO-WEAVER>` here is the absolute path of the `weaver` folder within your Cacti repository clone.
  * If you wish to start the driver without TLS, set the following parameter values:
    ```
    RELAY_TLS=false
    RELAY_TLSCA_CERT_PATH=
    DRIVER_TLS=false
    DRIVER_TLS_CERT_PATH=
    DRIVER_TLS_KEY_PATH=
    ```
    Otherwise, if you wish to start the driver with TLS enabled, set the following parameter values (replace `<PATH-TO-WEAVER>` with the absolute path of the `weaver` folder within your Cacti repository clone):
    ```
    RELAY_TLS=true
    RELAY_TLSCA_CERT_PATH=<PATH-TO-WEAVER>/core/relay/credentials/fabric_ca_cert.pem
    DRIVER_TLS=true
    DRIVER_TLS_CERT_PATH=<PATH-TO-WEAVER>/core/relay/credentials/fabric_cert.pem
    DRIVER_TLS_KEY_PATH=<PATH-TO-WEAVER>/core/relay/credentials/fabric_key
    ```
  * Leave the default values unchanged for the other parameters. The relay and driver endpoints as well as the network name are already specified.

#### Building

Build the Fabric driver module as follows:
- Navigate to the `weaver/core/drivers/fabric-driver` folder.
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created above.
- Run the following:
  ```bash
  make build
  ```

#### Running

Run a Fabric driver for `network1` as follows:
- Navigate to the `weaver/core/drivers/fabric-driver` folder.
- Run the following:
  ```bash
  npm run dev
  ```

Run a Fabric driver for `network2` as follows (_do this only if you wish to test interoperation between the two Fabric networks `network1` and `network2`_)
- Navigate to the `weaver/core/drivers/fabric-driver` folder.
- Run the following:
  ```bash
  CONNECTION_PROFILE=<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network2/peerOrganizations/org1.network2.com/connection-org1.json NETWORK_NAME=network2 RELAY_ENDPOINT=localhost:9083 DRIVER_ENDPOINT=localhost:9095 npm run dev
  ```

| Notes |
|:------|
| The variables we specified earlier in the `.env` for `network1` are now passed in the command line. Alternatively, you can make a copy of the `fabric-driver` folder with a different  name and create a separate `.env` file within it that contains links to the connection profile, relay, and driver for `network2`. |


### Fabric IIN Agent

IIN Agent is a client of a member of a DLT network or security domain with special permissions to update security domain identities and configurations on the ledger via the network's interoperation module. The code for this lies in the `weaver/core/identity-management/iin-agent` folder. Navigate to the `weaver/core/identity-management/iin-agent` folder.

#### Building

Build the IIN Agent as follows:
- Navigate to the `weaver/core/drivers/fabric-driver` folder.
- Create `.npmrc` from template `.npmrc.template`, by replacing `<personal-access-token>` with yours created above.
- Run the following:
  ```bash
  make build
  ```

#### Configuration

Ledger config file specifies ledger specific IIN Agent details such as identity and which network and organization to connect to.

1. To create config file for `Org1MSP`'s Fabric IIN Agent of `network1`, follow the steps:
    * Create copy of template config file for Fabric IIN Agent: `src/fabric-ledger/config.json.template`, say to location `src/fabric-ledger/config-n1-org1.json`.
    * Replace `<path-to-connection-profile>` with `<PATH-TO-WEAVER>/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json`, where replace `<PATH-TO-WEAVER>` with the absolute path of the `weaver` folder within your Cacti repository clone.
    * Set `mspId` as `Org1MSP`.
    * Set `agent.affiliation` as `org1.department1`.

2. To create config file for `Org2MSP`'s Fabric IIN Agent of `network1`, repeat `Step 1` with different name for config file, say `src/fabric-ledger/config-n1-org2.json`, and replace `org1` with `org2` and `Org1MSP` with `Org2MSP`.
3. To create config file for `Org1MSP`'s Fabric IIN Agent of `network2`, repeat `Step 1` with different name for config file, say `src/fabric-ledger/config-n2-org1.json`, and replace `network1` with `network2`.
4. To create config file for `Org2MSP`'s Fabric IIN Agent of `network2`, repeat `Step 1` with different name for config file, say `src/fabric-ledger/config-n2-org2.json`, and replace `network1` with `network2`, `org1` with `org2` and `Org1MSP` with `Org2MSP`.

#### Security Domain Configuration

Security Domain config file specifies the scope of security domain, which can be a channel in Fabric networks or list of nodes. File `docker-testnet/configs/security-domain-config.json` can be used for Weaver testnets.

#### DNS Configuration

To allow an IIN Agent's to be able to discover other IIN Agents, a config file for DNS is required. Create one `dnsconfig.json` by creating a copy of template `dnsconfig.json.template`, and replace the values with:

* If Fabric networks are started with 1 org, and IIN Agent are to be started without TLS, use following values:
```json
{
    "network1": {
        "Org1MSP": {
            "endpoint": "localhost:9500",
            "tls": false,
            "tlsCACertPath": ""
        }
    },
    "network2": {
        "Org1MSP": {
            "endpoint": "localhost:9501",
            "tls": false,
            "tlsCACertPath": ""
        }
    }
}
```

* If Fabric networks are started with 1 org, and IIN Agent are to be started with TLS, use following values:
```json
{
    "network1": {
        "Org1MSP": {
            "endpoint": "localhost:9500",
            "tls": true,
            "tlsCACertPath": "../../relay/credentials/fabric_ca_cert.pem"
        }
    },
    "network2": {
        "Org1MSP": {
            "endpoint": "localhost:9501",
            "tls": true,
            "tlsCACertPath": "../../relay/credentials/fabric_ca_cert.pem"
        }
    }
}
```

* If Fabric networks are started with 2 orgs, and IIN Agent are to be started without TLS, use following values:
```json
{
    "network1": {
        "Org1MSP": {
            "endpoint": "localhost:9500",
            "tls": false,
            "tlsCACertPath": ""
        },
        "Org2MSP": {
            "endpoint": "localhost:9510",
            "tls": false,
            "tlsCACertPath": ""
        }
    },
    "network2": {
        "Org1MSP": {
            "endpoint": "localhost:9501",
            "tls": false,
            "tlsCACertPath": ""
        },
        "Org2MSP": {
            "endpoint": "localhost:9511",
            "tls": false,
            "tlsCACertPath": ""
        }
    }
}
```

* If Fabric networks are started with 2 orgs, and IIN Agent are to be started with TLS, use following values:
```json
{
    "network1": {
        "Org1MSP": {
            "endpoint": "localhost:9500",
            "tls": true,
            "tlsCACertPath": "../../relay/credentials/fabric_ca_cert.pem"
        },
        "Org2MSP": {
            "endpoint": "localhost:9510",
            "tls": true,
            "tlsCACertPath": "../../relay/credentials/fabric_ca_cert.pem"
        }
    },
    "network2": {
        "Org1MSP": {
            "endpoint": "localhost:9501",
            "tls": true,
            "tlsCACertPath": "../../relay/credentials/fabric_ca_cert.pem"
        },
        "Org2MSP": {
            "endpoint": "localhost:9511",
            "tls": true,
            "tlsCACertPath": "../../relay/credentials/fabric_ca_cert.pem"
        }
    }
}
```

| Notes |
|:------|
| The variables we specified earlier in the `.env` for `network1` are now passed in the command line. Alternatively, you can make a copy of the `fabric-driver` folder with a different  name and create a separate `.env` file within it that contains links to the connection profile, relay, and driver for `network2`. |

#### Environment Variables

To configure environment variables for `Org1MSP`'s Fabric IIN Agent of `network1`, follow the steps:
1. Create a copy of `.env.template` as `.env`, and update following values based on previous configuration file paths:
```
IIN_AGENT_ENDPOINT=localhost:9500
MEMBER_ID=Org1MSP
SECURITY_DOMAIN=network1
DLT_TYPE=fabric
CONFIG_PATH=./src/fabric-ledger/config-n1-org1.json
DNS_CONFIG_PATH=./dnsconfig.json
SECURITY_DOMAIN_CONFIG_PATH=./docker-testnet/configs/security-domain-config.json
WEAVER_CONTRACT_ID=interop
AUTO_SYNC=true
```
2. If IIN Agent has to be started with TLS enabled, also update following values:
```
IIN_AGENT_TLS=false
IIN_AGENT_TLS_CERT_PATH=../../relay/credentials/fabric_cert.pem
IIN_AGENT_TLS_KEY_PATH=../../relay/credentials/fabric_key
```

#### Deployment

Use the following steps to run Fabric IIN Agents in host machine:
* To start IIN Agent for `Org1MSP` of `network1`, run:
```bash
npm run dev
```
* To start IIN Agent for `Org2MSP` of `network1` (_only required if Fabric network was started with 2 orgs_), run:
```bash
IIN_AGENT_ENDPOINT=localhost:9510 MEMBER_ID=Org2MSP CONFIG_PATH=./src/fabric-ledger/config-n1-org2.json npm run dev
```
* To start IIN Agent for `Org1MSP` of `network2`, run:
```bash
IIN_AGENT_ENDPOINT=localhost:9501 SECURITY_DOMAIN=network2 CONFIG_PATH=./src/fabric-ledger/config-n2-org1.json npm run dev
```
* To start IIN Agent for `Org2MSP` of `network2` (_only required if Fabric network was started with 2 orgs_), run:
```bash
IIN_AGENT_ENDPOINT=localhost:9511 MEMBER_ID=Org2MSP SECURITY_DOMAIN=network2 CONFIG_PATH=./src/fabric-ledger/config-n2-org2.json npm run dev
```


## Corda Components

Using the sequence of instructions below, you can start a Corda network and run an application CorDapp on it. You can also run an interoperation CorDapp, a relay and a _driver_ acting on behalf of the network. You can initialize the network's vault with access control policies, foreign networks' security groups (i.e., membership providers' certificate chains), and some sample state values that can be shared during subsequent interoperation flows.

### Corda Network

The Corda networks' code lies in the `weaver/tests/network-setups/corda` folder. You can launch two separate Corda networks, namely `Corda_Network` and `Corda_Network2`. Each network runs the `weaver/samples/corda/corda-simple-application` CorDapp by default, which maintains a state named `SimpleState` containing a set of key-value pairs (of strings).

The following steps will, in addition to launching the network, build the CorDapp and a Corda client in `weaver/samples/corda/corda-simple-application/client`.

#### Running with Interoperation CorDapp from GitHub Packages

Follow the instructions below to build and launch the network:
- Navigate to the `weaver/tests/network-setups/corda` folder.
- Create a copy of `github.properties.template` as `github.properties`.
- Replace `<GITHUB email>` with your GitHub email, and `<GITHUB Personal Access Token>` with the access token created [above](#package-access-token).
- To spin up the Corda networks with the Interoperation CorDapps:
  - Each consisting of 1 node and a notary (for data-transfer), run:
    ```bash
    make start
    ```
  - Each consisting of 2 nodes and a notary (for asset-exchange/transfer), run:
    ```bash
    make start PROFILE="2-nodes"
    ```
  - Each consisting of 3 nodes and a notary (for asset-exchange/transfer), run:
    ```bash
    make start PROFILE="3-nodes"
    ```

You should see the following message in the terminal:
```
Waiting for network node services to start
```
The Corda nodes and notary may take a while (several minutes on memory-constrained systems) to start. If they start up successfully, you should something like the following for each network, though the number of node entries will depend on the profile you used to start the network with (replace `<network-name>` with `Corda_Network` or `Corda_Network2`):
```bash
PartyA node services started for network <network-name>
PartyB node services started for network <network-name>
PartyC node services started for network <network-name>
Notary node services started for network <network-name>
```

### Corda Relay

The relay was built earlier, so you just need to use a different configuration file to start a relay for the Corda network.

Run a relay for `Corda_Network` as follows:
- Navigate to the `weaver/core/relay` folder.
- (Make sure you've already built the relay by running `make`.)
- To launch the server without TLS, leave the configuration file `config/Corda_Relay.toml` in its default state. Otherwise, edit it to set TLS flags for this relay and the other relays and drivers it will connect to in this demonstration as follows:
  ```toml
  .
  .
  cert_path="credentials/fabric_cert.pem"
  key_path="credentials/fabric_key"
  tls=true
  .
  .
  [relays]
  [relays.Fabric_Relay]
  hostname="localhost"
  port="9080"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Fabric_Relay2]
  hostname="localhost"
  port="9083"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Corda_Relay2]
  hostname="localhost"
  port="9082"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  [drivers]
  [drivers.Corda]
  hostname="localhost"
  port="9099"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  ```
- To launch the server, simply run the following:
  ```bash
  RELAY_CONFIG=config/Corda_Relay.toml cargo run --bin server
  ```

  If the relay starts up successfully, the following will be logged on your terminal:

  ```
  Relay Name: "Corda_Relay"
  RelayServer listening on [::1]:9081
  ```

Run a relay for `Corda_Network2` as follows (_do this only if you have launched both Corda networks `Corda_Network` and `Corda_Network2` and wish to test interoperation between them_)
- Navigate to the `weaver/core/relay` folder.
- To launch the server without TLS, leave the configuration file `config/Corda_Relay2.toml` in its default state. Otherwise, edit it to set TLS flags for this relay and the other relays and drivers it will connect to in this demonstration as follows:
  ```toml
  .
  .
  cert_path="credentials/fabric_cert.pem"
  key_path="credentials/fabric_key"
  tls=true
  .
  .
  [relays]
  [relays.Fabric_Relay]
  hostname="localhost"
  port="9080"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Fabric_Relay2]
  hostname="localhost"
  port="9083"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  [relays.Corda_Relay]
  hostname="localhost"
  port="9081"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  [drivers]
  [drivers.Corda]
  hostname="localhost"
  port="9098"
  tls=true
  tlsca_cert_path="credentials/fabric_ca_cert.pem"
  .
  .
  ```
- To launch the server, simply run the following:
  ```bash
  RELAY_CONFIG=config/Corda_Relay2.toml cargo run --bin server
  ```

  If the relay starts up successfully, the following will be logged on your terminal:

  ```
  Relay Name: "Corda2_Relay"
  RelayServer listening on [::1]:9082
  ```

### Corda Driver

The code for this lies in the `weaver/core/drivers/corda-driver` folder.

#### Building Corda Driver

Build the Corda driver module as follows:
- Navigate to the `weaver/core/drivers/corda-driver` folder.
- Create a copy of `github.properties.template` as `github.properties`.
- Replace `<GITHUB email>` with your GitHub email, and `<GITHUB Personal Access Token>` with the access token created [above](#package-access-token).
- Run the following:
  ```bash
  make build
  ```

#### Configuring

Configure the drivers as follows (you can skip this if you wish to run the drivers without TLS):
- Navigate to the `weaver/core/drivers/corda-driver` folder and create a `.env` file.
- To run the drivers without TLS, set the following default values:
  ```
  RELAY_TLS=false
  RELAY_TLSCA_TRUST_STORE=
  RELAY_TLSCA_TRUST_STORE_PASSWORD=
  RELAY_TLSCA_CERT_PATHS=
  ```
- To run the drivers with TLS, set the following values (replace `<PATH-TO-WEAVER>` with the absolute path of the `weaver` folder within your Cacti repository clone):
  ```
  RELAY_TLS=true
  RELAY_TLSCA_TRUST_STORE=<PATH-TO-WEAVER>/core/relay/credentials/fabric_trust_store.jks
  RELAY_TLSCA_TRUST_STORE_PASSWORD=trelay
  RELAY_TLSCA_CERT_PATHS=<PATH-TO-WEAVER>/core/relay/credentials/fabric_ca_cert.pem
  ```

#### Running

Run a Corda driver as follows:
- Navigate to the `weaver/core/drivers/corda-driver` folder.
- Run the following to start Corda driver for `Corda_Network`:
  ```bash
  ./build/install/corda-driver/bin/corda-driver
  ```
  If the driver starts successfully, it should log the following message on your terminal:
  ```
  Corda driver gRPC server started. Listening on port 9099
  ```
- Run the following to start Corda driver for `Corda_Network2`:
  ```bash
  DRIVER_PORT=9098 ./build/install/corda-driver/bin/corda-driver
  ```
  If the driver starts successfully, it should log the following message on your terminal:
  ```
  Corda driver gRPC server started. Listening on port 9098
  ```

## Tear Down the Setup

Bring down the test network's components as follows:
- Simply terminate the various relays and drivers, which are running in the foreground in different terminals
- To bring down the running Corda network:
  * Navigate to the `weaver/tests/network-setups/corda` folder.
  * Run the following:
    ```bash
    make clean
    ```
- To bring down all the running Fabric networks:
  * Navigate to the `weaver/tests/network-setups/fabric/dev` folder.
  * Run the following:
    ```bash
    make clean
    ```
