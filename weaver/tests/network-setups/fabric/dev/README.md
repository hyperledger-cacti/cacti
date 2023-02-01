<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Fabric Testnet

## Running with Make

If you are ok with the default configuration you can simply use the default make targets.

- `make all` or `make start` starts both network1 and network2 and will download all the required dependencies (via `make .fabric-setup`).
- `make start-interop` starts both network1 and network2 and will download all the required dependencies (via `make .fabric-setup`) and then download and install chaincode required for interop.
- `make stop` will tear down both network1 and network2 but artifacts of both networks will be retained to reuse for next run
- `make remove` will tear down networks of network1 and network2 along with artifcats.
- `make clean` will tear down the networks (using `make stop`) and remove any downloaded dependencies
- `make start-network1` will start network1
- `make start-interop-network1` will start network1 and set up chaincode for interop.
- `make setup-interop-network1` will setup up chaincode for network 1
- `make start-network2` will start network2 
- `make start-interop-network2` will start network2 and set up chaincode for interop.
- `make setup-interop-network2` will setup up chaincode for network 2
- `make stop-network1` will stop network1
- `make stop-network2` will stop network2
- `make remove-network1` will remove network1
- `make remove-network2` will remove network2

If you want to be able to have more control on the setup and configuration of the network, proceed to read the next section and 
use the capabilities of the underlying script `network.sh`.

NOTE: For runnining inteorp setup/start scripts you will need to set up github properties in the `shared` directory. 

## Running via network.sh

### Prerequisites

Before starting fabric-testnet, we need to ensure the following prerequisite are met.

1. Clone this repository to bring up TWO simple Fabric networks with 1 peer, 1 org , ca_org1, ca_orderer and 1 orderer node. ie network1 & network2
2. Download Hyperledger Fabric docker images and platform binaries.

   a. Change directory to cloned repository: `cd network-setups/fabric/dev` . \
   b. Download Hyperledger Fabric docker images and platform binaries

```shell
curl -sSL https://bit.ly/2ysbOFE | bash -s -- <fabric_version> <fabric-ca_version> <thirdparty_version>
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.1.0 1.4.7 0.4.20 -s
```

Note: Above curl command will create a bin folder in `network-setups/fabric/dev` folder and binaries will be placed in `bin` folder.

### Setting up a fabric-testnet

1. Ensure your docker engine is up and running, and change directory to `network-setups/fabric/dev`
2. To start network1, run the script `./network.sh up createChannel -nw network1`
3. To start network2, run the script `./network.sh up createChannel -nw network2`
4. Once the above script successfully completes, run `docker ps` to confirm fabric peer and orderer containers are running for both networks.
5. Run `./network.sh down -nw network1` to stop the network1.
6. Run `./network.sh down -nw network2` to stop the network2.

### Deploy chaincode

To Deploy the chaincode, follow the below steps.

1. Ensure testnet is up and running.
2. Copy the chaincode folder to `network-setups/fabric/shared/chaincode` folder
3. To Deploy the chaincode in network1, change directory to `network-setups/fabric/dev` 
   Run: ./network.sh deployCC -ch chaincodename -nw network1 
   Example:
   `cd network-setups/fabric/dev`; `./network.sh deployCC -ch simplestate -nw network1`
4. To Deploy the chaincode in network2, change directory to `network-setups/fabric/dev` 
   Run: `./network.sh deployCC -ch chaincodename -nw network2` 
   Example:
   `cd network-setups/fabric/dev`; `./network.sh deployCC -ch simplestate -nw network2`

### Configs & Customisations
   network-setups supports 2 Hyperledger Fabric networks, ie network1 and network2. 
   The configuration files to bring up these networks is available at `network-setups/fabric/dev` 
   under the file names `network1.env`  and `network2.env` 
   These files defines various parameters that will be used to bring up the network.

   The default ports used in network1 are : 
   ```
   N1_CA_ORG1_PORT=7054 
   N1_CA_ORDERER_PORT=9054 
   N1_CHAINCODELISTEN_PORT=7052 
   N1_COUCHDB_PORT=7084 
   N1_ORDERER_PORT=7050 
   N1_PEER_PORT=-7051 
   ```
   The default ports used in network2 are : 
   
   ```
   N2_CA_ORG1_PORT=5054 
   N2_CA_ORDERER_PORT=8054 
   N2_CHAINCODELISTEN_PORT=9052 
   N2_COUCHDB_PORT=9984 
   N2_COUCHDB_PORT=9999 
   N2_ORDERER_PORT=9050 
   N2_PEER_PORT=9051 
   ```

   The `network.sh` script supports environment variable substitution using the utility envsubst
   To override the environment variables/default configuration, use the script in the format of:
   
   ```
   N1_PEER_PORT=XXXX network.sh ...
   ```

   To instantiate the Fabric Interoperation Chaincode on a channel within either network,
   specify the environment variable `E2E_CONFIDENTIALITY` as `true` in the command line.
   For example:
   ```
   E2E_CONFIDENTIALITY=true make start-interop
   ```

### Troubleshooting
   Incase of an abrupt shutdown of the network, chances are there to fail the susequent startup.
   This is due to the fact that remnants of previous network is still active in docker.
   To get rid of unused containers/volumes run `docker system prune` and start the network again.
