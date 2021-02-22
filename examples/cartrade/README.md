# example-cartrade

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
	- `applicationHostInfo.hostPort` (The port number of Routing-interface http server, the default is 5034) on `/packages/config/default.json`
1. Go to the following directory:
	- `cd cactus/examples/cartrade/`
1. Start ledgers:
	- `./script-start-ledgers.sh` 
1. Build validators, packages, and the cartrade app:
	- `./script-build-all.sh`
1. Start validators and the cartrade app
	- Please open three consoles and execute the following:.
	- Start the validator for Fabric on the first console:
		`./script-start-validator-fabric.sh`
	- Start the validator for Ethereum on the second console: 
		`./script-start-validator-ethereum.sh`
	- Start the cartrade app on the third console:
		`./script-start-cartrade.sh`

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