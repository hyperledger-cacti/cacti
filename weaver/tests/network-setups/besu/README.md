<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Setting up two Besu Test Networks

## Prerequisites
- tmux: sudo apt install tmux
- Besu: 
	* Download and unpack the latest https://github.com/hyperledger/besu/releases/latest. You will find it in the link of the form: https://hyperledger.jfrog.io/artifactory/besu-binaries/besu/x.y.z/besu-x.y.z.zip with x.y.z replaced with the version number. For instance, run the following command after updating version number accordingly.
```
wget https://hyperledger.jfrog.io/artifactory/besu-binaries/besu/21.7.0/besu-21.7.0.zip
```
	* Add the path to besu-x.y.z/bin to PATH
- EthSigner: 
	* Download and unpack the latest from https://cloudsmith.io/~consensys/repos/ethsigner/packages/?q=tag%3Alatest (Requires Java 11 or later)
	* Add the path to ethsigner-x.y.z/bin to PATH
- Node.js: https://nodejs.org/en/download/

## Deploy
Run the following command to spin up a new Besu test network using the IBFT 2.0 consensus protocol with four validator nodes:
```
make start
```
This command would also have started EthSigner with support for multiple singing keys with all the four validator nodes as signers.

## Testing
A set of RPC calls to EthSigner and the Besu network are made to test the setup of the network. This set of tests are preliminary for now and will be made extensive over time.
```
make test
```
NOTE: 
- Starting the network on a slow server might require you to wait longer after the command to deploy the network before the testing script is called. 
- If the server is extremely slow for Node-1 to take more than 10 seconds to start, the sleep time before starting Node-2 in the setup script (scripts/setupNetwork.sh) should be increased. The latter can be detected going inside the tmux session of Nodes 2, 3 or 4.

## Clean
To stop the network and to clean up the network data, run
```
make clean
```
