---
id: ledger-initialization
title: Ledger Initialization
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Once the two Fabric networks and the Corda network are up and running along with their associated relays and drivers, we must initialize states in those networks to prepare them for interoperation. For the Fabric networks, this involves recording state in the channel ledgers, and for the Corda network, in the nodes' vaults.

## Initializing the Fabric Networks

We use the Fabric CLI (`fabric-cli`) built earlier (in `samples/fabric/fabric-cli`) for this purpose.

### Configuring the Fabric CLI

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
- Create a `.env` file by copying `.env.template` and setting following parameter values (_replace `<PATH-TO-WEAVER>` with the location of your clone of weaver_):
  * For Host deployment:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials
    CONFIG_PATH=./config.json
    ```
  * For Dockerized deployment:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials_docker
    CONFIG_PATH=./config.json
    ```
  * Leave the default values unchanged for the other parameters.
- Run the following commands:
  ```
  ./bin/fabric-cli env set-file ./.env
  ```
- If you haven't assigned a value to the CONFIG_PATH environment variable in .env, then run this:
  ```
  ./bin/fabric-cli config set-file ./config.json
  ```

See the [Fabric CLI](#fabric-cli) section for more information.

### Bootstrapping Network and Application State

Finally, to prepare both `network1` and `network2` for interoperation, run:

```bash
./bin/fabric-cli configure all network1 network2
```

## Initializing the Corda Network

Once the Corda network is launched, the client application (built earlier) needs to be exercised to generate network (ledger) state in preparation to test interoperation flows.

### Bootstrapping Network and Application State
Just as we did for either Fabric network, the Corda network ledger (or _vault_ on each node) must be initialized with access control policies, verification policies, and security group information for the two Fabric networks. Further, sample key-value pairs need to be recorded so we can later share them with a Fabric network via an interoperation flow.

Bootstrap the Corda network and application states as follows:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following: 
  * For host deployment:
    ```bash
    make initialise-vault
    ```
  * For dockerized deployment:
    ```bash
    make initialise-vault-docker
    ```
