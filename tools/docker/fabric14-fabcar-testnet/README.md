<!--
 Copyright 2019-2020 Fujitsu Laboratories Ltd.
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# A tool to launch Hyperledger Fabric docker containers

## Abstract
- Modules to launch Hyperledger Fabric docker containers

## How to build
- Execute the following command, then the docker containers will be launched.
	```
	./script-start-ledger.sh
	```
- If the following containers appear when you display the container list with the command `docker ps`, it will be fine.
	```
	CONTAINER ID        IMAGE                                                                                                    COMMAND                  CREATED              STATUS              PORTS                                                    NAMES
	14b98ba40b66        dev-peer0.org1.example.com-fabcar-1.0-5c906e402ed29f20260ae42283216aa75549c571e2e380f3615826365d8269ba   "chaincode -peer.add…"   42 seconds ago       Up 40 seconds                                                                dev-peer0.org1.example.com-fabcar-1.0
	d0efd7479bdd        hyperledger/fabric-tools                                                                                 "/bin/bash"              About a minute ago   Up 56 seconds                                                                cli
	c9bd7ddfde7e        hyperledger/fabric-peer                                                                                  "peer node start"        About a minute ago   Up About a minute   0.0.0.0:7051->7051/tcp, 0.0.0.0:7053->7053/tcp           peer0.org1.example.com
	d4f2b1a76626        hyperledger/fabric-couchdb                                                                               "tini -- /docker-ent…"   About a minute ago   Up About a minute   4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp               couchdb
	53a79780f564        hyperledger/fabric-ca                                                                                    "sh -c 'fabric-ca-se…"   About a minute ago   Up About a minute   0.0.0.0:7054->7054/tcp                                   ca.example.com
	aceb0e52e9c7        hyperledger/fabric-orderer                                                                               "orderer"                About a minute ago   Up About a minute   0.0.0.0:7050->7050/tcp                                   orderer.example.com
	```

## Note
- The details of the method for constructing the above environment are described in the following document.
	- https://hyperledger-fabric.readthedocs.io/en/release-1.4/install.html