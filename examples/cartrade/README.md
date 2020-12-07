# example-cartrade

## Boot method

1. Before booting, please modify the following information for your environment
	- applicationHostInfo.hostName (URL of the host on the Location header) on `/packages/config/default.json`
	- applicationHostInfo.hostPort (The port number of Routing-interface http server) on `/packages/config/default.json`

1. Start ledgers:
	- `./script-start-ledgers.sh` 
1. Build validators, packages, and the cartrade app:
	- `./script-build-all.sh`
1. Start validators and the cartrade app
	- Please open three consoles and execute the following:.
	- Start the validator for Fabric:
		`./script-start-validator-fabric.sh`
	- Start the validator for Ethereum:
		`./script-start-validator-ethereum.sh`
	- Start the cartrade app:
		`./script-start-cartrade.sh`

## How to use this application
- Run with curl, etc. Currently only POST is available.
- Examples of curl POSTs:.
	- **transaction execution**
		- `curl localhost:5034/api/v1/bl/trades/ -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"guks32pf","tradeParams":["0xec709e1774f0ce4aba47b52a499f9abaaa159f71", "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55", "user01", "user02", 50, "CAR1"],"authParams":["none"]}'`
	- **Transaction Reference**
		- `curl localhost:5034/api/v1/bl/trades/XXXXXXXXXXXXXX-XXX -XGET`
	- **Login**
		- `curl localhost:5034/api/v1/bl/login/ -XPOST -H "Content-Type: application/json" -d '{"userid":"user01","pwd":"hoge"}'`

- In the case of the above "transaction execution", the console log is the following:
	```
	[2020-08-21T19:55:24.207] [INFO] TransactionManagement - tradeID: 20200821195524-001
	[2020-08-21T19:55:24.282] [INFO] BusinessLogicCartrade - firstTransaction txId : 0xafe7c812ab55c02feb691d2133bbba2c38abaf7f221794c3ca833a29708f4653
	[2020-08-21T19:56:20.005] [INFO] BusinessLogicCartrade - ##INFO: underEscrow -> underTransfer, businessLogicID: guks32pf, tradeID: 20200821195524-001
	[2020-08-21T19:56:20.608] [INFO] BusinessLogicCartrade - secondTransaction txId : 17c7577f73560ea5955f3151ed678833aa45d1252b34c6f933a7123757e82969
	[2020-08-21T19:56:23.691] [INFO] BusinessLogicCartrade - ##INFO: underTransfer -> underSettlement, businessLogicID: guks32pf, tradeID: 20200821195524-001
	[2020-08-21T19:56:23.703] [INFO] BusinessLogicCartrade - thirdTransaction txId : 0x61acb066349e24319afdf272b35429d198046e10f8fca3972f17a9e9a4dca75d
	[2020-08-21T19:56:31.518] [INFO] BusinessLogicCartrade - ##INFO: completed cartrade, businessLogicID: guks32pf, tradeID: 20200821195524-001
	```
	- When the message `"##INFO: completed cartrade"` happens, the transaction is completed.

## How to confirm operation results
- How to check your account balance
	- `/packages/ledger-plugin/go-ethereum/validator/unit-test/validatorDriver_getNumericBalance.js`
		- Example: `node validatorDriver_getNumericBalance.js`
 		- The balance of the account is displayed on the Validator's console.
 		- Example output
			```
			[2020-08-18T17:06:15.795] [INFO] connector_main[6710] - Response  :{"status":200,"amount":1900}
			```
- How to identify the owner of the car
	- `/packages/ledger-plugin/fabric/validator/unit-test/queryCar.js`
	- Example: `node queryCar.js CAR1`
	- The owner of the car is displayed on the console.
	- Example output
		```
		##queryCar Params: CAR1
		Transaction has been evaluated, result is: {"colour":"red","make":"Ford","model":"Mustang","owner":"user02"}
		```
- How to change the ownership of the car by hand
	- ``/packages/ledger-plugin/fabric/validator/unit-test/validatorDriver_signTransactionOffline.js``