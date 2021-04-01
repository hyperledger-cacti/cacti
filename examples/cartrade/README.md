# Cactus car-trade

## Abstract

Cactus **car-trade** is a sample application where users can exchange car ownership (represented by Fabcar chaincode tokens on a Hyperledger Fabric blockchain) for ETH currency on a private Ethereum blockchain. The application takes the form of a "business logic plugin" which is a central point of our architecture.

![car-trade image](./images/car-trade-image.png)

## Prerequisites

Before you begin, you need to check that you have all the prerequisites installed as follows:
- OS: Linux (recommended: Ubuntu18.04 or CentOS7)
- Docker (recommend: v17.06.2-ce or greater)
- Docker-compose (recommend: v1.14.0 or greater)
- node.js v12 (recommend: v12.20.2 or greater)
- The ports 5034, 5040, 5050 are available (If they are already used, the following processes can be done by changing the port number setting)

## Boot method

1. Before booting, please modify the following information for your environment
	- `applicationHostInfo.hostName` (IP address of the host on the Location header) on `/packages/config/default.json`
1. (Optional) Please modify the following information for your environment if necessary. This procedure should only be performed by users who cannot use port 5034.
	- `applicationHostInfo.hostPort` (The port number of Routing-interface http server, the default is 5034) on `/packages/config/default.json`
1. Go to the following directory:
	```
	cd cactus/examples/cartrade/
	```
1. Start ledgers:
	```
	./script-start-ledgers.sh
	```
	- (NOTICE: Before executing the above, your account needs to be added to the docker group (`usermod -a -G docker YourAccount` from root user))
	- If the following containers are started when displaying the container list with the docker ps command, it will be fine.
		```
		CONTAINER ID        IMAGE                                                                                                    COMMAND                  CREATED              STATUS              PORTS                                                    NAMES
		14b98ba40b66        dev-peer0.org1.example.com-fabcar-1.0-5c906e402ed29f20260ae42283216aa75549c571e2e380f3615826365d8269ba   "chaincode -peer.add…"   42 seconds ago       Up 40 seconds                                                                dev-peer0.org1.example.com-fabcar-1.0
		d0efd7479bdd        hyperledger/fabric-tools                                                                                 "/bin/bash"              About a minute ago   Up 56 seconds                                                                cli
		c9bd7ddfde7e        hyperledger/fabric-peer                                                                                  "peer node start"        About a minute ago   Up About a minute   0.0.0.0:7051->7051/tcp, 0.0.0.0:7053->7053/tcp           peer0.org1.example.com
		d4f2b1a76626        hyperledger/fabric-couchdb                                                                               "tini -- /docker-ent…"   About a minute ago   Up About a minute   4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp               couchdb
		53a79780f564        hyperledger/fabric-ca                                                                                    "sh -c 'fabric-ca-se…"   About a minute ago   Up About a minute   0.0.0.0:7054->7054/tcp                                   ca.example.com
		aceb0e52e9c7        hyperledger/fabric-orderer                                                                               "orderer"                About a minute ago   Up About a minute   0.0.0.0:7050->7050/tcp                                   orderer.example.com
		ec57c9f78d0d        ethereum/client-go:v1.8.27                                                                               "geth --rpc --networ…"   2 minutes ago        Up 2 minutes        8546/tcp, 0.0.0.0:8545->8545/tcp, 30303/tcp, 30303/udp   geth1
		```
1. Build validators, packages, and the cartrade app:
	```
	./script-build-all.sh
	```
1. Start validators and the cartrade app
	- Please open three consoles and execute the following:.
	- Start the validator for Fabric on the first console using the port 5040:
		```
		./script-start-validator-fabric.sh
		```
	- Start the validator for Ethereum on the second console using the port 5050: 
		```
		./script-start-validator-ethereum.sh
		```
	- Start the cartrade app on the third console using the port 5034:
		```
		./script-start-cartrade.sh
		```

## How to use this application

1. (Optional) Check the balance on Ethereum and the fabcar ownership on Fabric using the following script
	- `./script-build-get-app.sh` (only the first time)
	- `./script-get-app.sh`
	- The result is as the following:
		```
		[process] Execute an app for getting Balance on Ethereum
		The balance of fromAccount:
		BigNumber { s: 1, e: 4, c: [ 100000 ] }
		The balance of toAccount:
		BigNumber { s: 1, e: 1, c: [ 0 ] }
		[process] Execute an app for getting ownership on Fabcar
		##queryCar Params: CAR1
		Transaction has been evaluated, result is: {"colour":"red","make":"Ford","model":"Mustang","owner":"Brad"}
		```
1. Run the transaction execution using the following script
	- `./script-post-cartrade-sample.sh`
	- After this, the transactions are executed by order. When the following log appears on the above third console (the console of `./script-start-cartrade.sh`), the transactions are completed.
		```
		[INFO] BusinessLogicCartrade - ##INFO: completed cartrade, businessLogicID: guks32pf, tradeID: *******-001
		```
1. (Optional) Check the balance on Ethereum and the fabcar ownership on Fabric using the following script
	- `./script-get-app.sh`
	- The result is as the following. In the following case, 50 coins from fromAccount was transferred to toAccount, and the car ownership ("owner") was transferred.
		```
		[process] Execute an app for getting Balance on Ethereum
		The balance of fromAccount:
		BigNumber { s: 1, e: 4, c: [ 99950 ] }
		The balance of toAccount:
		BigNumber { s: 1, e: 1, c: [ 50 ] }
		[process] Execute an app for getting ownership on Fabcar
		##queryCar Params: CAR1
		Transaction has been evaluated, result is: {"colour":"red","make":"Ford","model":"Mustang","owner":"Cathy"}
		```

## How to stop the application and Docker containers

1. Stop the above validators (`./script-start-validator-fabric.sh` and `./script-start-validator-ethereum.sh`) and the cartrade app (`./script-start-cartrade.sh`).
	- Press Ctrl+C on the above three consoles.
1. Stop the docker containers of Ethereum and Fabric
	- Press the command `docker stop <CONTAINER ID>` to stop the container corresponding to the above containers which were launched by `./script-start-ledgers.sh` on the boot method. If you want to destroy the docker containers, press the command `docker rm <CONTAINER ID>` after the above.
	- If any other docker containers are not running on your machine, you can destroy the Docker containers only with `docker ps -aq | xargs docker stop` and `docker ps -aq | xargs docker rm`.

