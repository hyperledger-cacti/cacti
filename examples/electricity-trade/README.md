# electricity-trade

## Prerequisites

Before you begin, you need to check that you have all the prerequisites installed as follows:
- Docker (recommend: v17.06.2-ce or greater)
- Docker-compose (recommend: v1.14.0 or greater)
- node.js (recommend: v12)
- The ports 5034, 5040, 5051 are available (If they are already used, the following processes can be done by changing the port number setting)

## Boot method

1. Before booting, please modify the following information for your environment
	- `applicationHostInfo.hostName` (IP address of the host on the Location header) on `/packages/config/default.json`
	- `applicationHostInfo.hostPort` (The port number of Routing-interface http server, the default is 5034) on `/packages/config/default.json`
1. Go to the following directory:
	- `cd cactus/examples/electricity-trade/`
1. Start ledgers:
	- `./script-start-ledgers.sh` 
1. Build validators, packages, and the cartrade app:
	- `./script-build-all.sh`
1. Start validators and the cartrade app
	- Please open three consoles and execute the following:.
	- Start the validator for Sawtooth on the first console:
		`./script-start-validator-sawtooth.sh`
	- Start the validator for Ethereum on the second console: 
		`./script-start-validator-ethereum.sh`
	- Start the cartrade app on the third console:
		`./script-start-electricity-trade.sh`

## How to use this application

#### Assumption

- The parameters are used on this application
	- Source account on Ethereum: `06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97`
	- The privkey of source account on Ethereum: `cb5d48d371916a4ea1627189d8af4f642a5d72746a06b559780c3f5932658207`
	- Destination account on Ethereum: `9d624f7995e8bd70251f8265f2f9f2b49f169c55`
	- The key name of intkey on Sawtooth: `MI000001`

#### Setup the application

1. Set the intkey script on Sawtooth docker:
	- `./script-set-sawtooth-intkey.sh`
1. Register on account information:
	- `curl localhost:5034/api/v1/bl/electricity-trade/meter/register/ -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"h40Q9eMD","meterParams":["MI000001", "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97", "cb5d48d371916a4ea1627189d8af4f642a5d72746a06b559780c3f5932658207", "9d624f7995e8bd70251f8265f2f9f2b49f169c55"]}'`

#### Run the application

1. (Optional) Check the balance on Ethereum accounts using the following script
	- Check the balance of the source account as the following: 
	- `curl localhost:5034/api/v1/bl/balance/06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97`
		- The result: `{"status":200,"amount":100000}`
	- Check the balance of the destination account:
	- `curl localhost:5034/api/v1/bl/balance/9d624f7995e8bd70251f8265f2f9f2b49f169c55`
		- The result: `{"status":200,"amount":0}`

1. Start the electricity-trade application
	- `curl localhost:5034/api/v1/bl/electricity-trade/ -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"h40Q9eMD"}'`
		- The example response of tradeID: `{"tradeID":"20210220075755506-001"}`
	- (Then, the application starts to monitor the Sawtooth blockchain)

1. Execute the intkey transaction on Sawtooth blockchain
	- Open the docker bash: `docker exec -it sawtooth-shell-default bash`
	- Execute the intkey transaction:
	`intkey create_batch --key-name MI000001 --value-set 50 --value-inc 24`
	`sawtooth batch submit -f batches.intkey --url http://rest-api:8008`
	- (In the above, the value of the key `MI000001` is set as 50, and increased by 24)
	- After that, exit the docker bash:
	`exit`

1. (Optional) Check the balance on Ethereum accounts using the following script
	- Check the balance of the source account as the following: 
	- `curl localhost:5034/api/v1/bl/balance/06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97`
		- The result: `{"status":200,"amount":99976}`
	- Check the balance of the destination account:
	- `curl localhost:5034/api/v1/bl/balance/9d624f7995e8bd70251f8265f2f9f2b49f169c55`
		- The result: `{"status":200,"amount":24}`
	- (The result shows that the asset was transferred between Ethereum addresses depending on the value of the change in Sawtooth intkey.)