# Cactus discounted-cartrade


## Abstract

Cactus discounted-cartrade is a sample application that adds employee discounts to the original Cactus cartrade. In this application, when the users transfer the car ownership in the cactus cartrade, they present their employee proofs to the rent-a-car company to receive an employee discount. We implement the employee proofs by proofs on Hyperledger Indy. As with the original application, car ownership is represented by a Fabcar chaincodetoken on Hyperledger Fabric, which can be exchanged for ETH currency on a private Ethereum blockchain. This Business Logic Plugin (BLP) application controls a process from employee certification using Hyperledger Indy to payment using Ethereum.

![discounted-cartrade image](./image/discounted-cartrade-image.png)


## Scenario

The application works in the following scenario:

### Settings

Alice wants to rent a car using the services of rental car company Thrift Corp. Alice chose this company because she is an employee of Acme Corp., which offers discounts on Thrift Corp.'s services as a benefit.

**Note** : Acme Corp and Thrift Corp have the same names on the sample application on Hyperledger Indy.

### Preparations

Alice knows that Acme Corp. provides digital certificates. She asks Acme Corp. to issue a credential when she uses various services, and the company issues it.

### When Alice Uses the Service

Alice will use credentials and other Indy formats such as schema and definition to create an employee proof that she will present when applying the lent-a-car service. Alice then sends a car usage application and her employee proof to the Cactus Node Server via an End User Application. The employee proofs consist of proof requests and proofs on Hyperledger Indy. The Cactus Node server receives the schema and definition from the Indy ledger via Validator and uses this information to verify the proof with the BLP. Once verified, the BLP will decide what she should pay based on the price list and then proceed with the original cartrade application using cactus as an escrow to transfer ETH currencies and car ownership tokens to each other.


## How to use: Preparations

### How to construct indy_testnet environment
"indy_testnet environment" is host environment for running indy-pool or validator containers.

1. Please clone the base program from a publicly available git repository
    ```
    $ git clone https://github.com/hyperledger/indy-sdk.git
    $ git clone https://github.com/hyperledger/cactus.git
    ```
    - indy-sdk and cactus must be cloned in the same directory.


2. Please modify the container IP information in indy_pool
    - Please edit the above cloned `indy-sdk/ci/indy-pool.dockerfile`.
    - Please change the IP address on line 95 to `ARG pool_ip = 172.16.0.2`.


3. Changing sandbox permissions
    ```
    $ cd cactus/tools/docker/indy-testnet/
    $ sudo chown 1000:1000 -R sandbox
    $ ls -n ./sandbox
      drwxr-xr-x.  6 1000 1000   58  June  8  2021 data
                     ~~~~~~~~~ It will be fine if it becomes 1000 here.
    ```


4. Creating images using docker-compose
    ```
    $ docker-compose -f ./docker-compose.yaml build
    ```


5. Please create and build containers
    - Executing the above command will not return to the console.
    - You can exit all three containers with ctrc+c.
    ```
    $ docker-compose -f ./docker-compose.yaml up
    ```


6. Please check that it is booting properly
    ```
    $docker ps
    ```
    - please check indy_pool, nginx and valipy are booting.



### How to execute INDY validator

Assume the following two directories exist in the same directory:
  - cactus
    ```
    $ git clone https://github.com/hyperledger/cactus.git
    ```
  - indy-sdk
    ```
    $ git clone https://github.com/hyperledger/indy-sdk.git
    ```


1. Creating and Booting containers

    - Executing the above command will not return to the console:
    ```
    $ cd cactus/tools/docker/indy-testnet/
    $ docker-compose -f ./docker-compose.yaml up
      Starting nginx     ... done
      Starting validator ... done
      Starting indy_pool ... done
    ```


2. Please check that it is booting properly
    ```
    $ docker ps | grep -e indy_pool -e nginx -e valipy
    ```
   - please check indy_pool, nginx and valipy are booting.


3. Please exec INDY validator
    ```
    $docker exec -it validator bash
    $ cd /root/validator
    $ TEST_POOL_IP=172.16.0.2 python -m main
    ```


4. Please exec test driver (in host server)
    ```
    $ cp -frp cactus/examples/register-indy-data/req_discounted_cartrade.py indy-sdk/samples/python/src
    $ cd indy-sdk/samples/python
    $ TEST_POOL_IP=172.16.0.2 python -m src.req_discounted_cartrade
    ```
    - The log exits with an error, but if myproof.json is generated, it is OK.
    ```
    $ cd ../../../cactus/packages-python/cactus_validator_socketio/testcli
    $ npm install
    $ cp -frp ../../../../indy-sdk/samples/python/myproof.json ./
    $ node testsock.js
    ```
   - On successful execution, the following console log is output:
    ```
    ##signsignature: ******
    Authentication OK
    ```



## How to use: discounted-cartrade

### Preparations
- Please exec 3 validators (ethereum, fabric, indy):
   - ethereum: "validatorUrl": `https://localhost:5050`
   - fabric: "validatorUrl": `https://localhost:5040`
   - indy: "validatorUrl": `https://172.16.0.4:8000`


- The following drivers work properly:
   - ethereum: `unit_test/validatorDriver_getNumericBalance.js`
   - fabric: `unit_test/queryCar.js`
              `unit_test/validatorDriver_signTransactionOffline.js`
   - Indy: `testcli/testsock.js`
     - Please refer  "How to execute INDY validator: 4. Please exec test driver (in host server)".


- This procedure assumes the following two directories exist in the same directory:
    - cactus
      ```
      $ git clone https://github.com/hyperledger/cactus.git
      ```
    - indy-sdk
      ```
      $ git clone https://github.com/hyperledger/indy-sdk.git
      ```



### How to boot
1. Please get branch "main"
2. `$ cd cactus/packages`
3. `$ npm install`
4. If you modify the URL of the server for `cactus/packages/config/default.json`, create and modify `cactus/examples/discounted-cartrade/config/usersetting.json`.
   - `applicationHostInfo.hostName`
     - this is URL of the host returned in the Location header
   - `applicationHostInfo.hostPort`
     - this is http server port number
   - For items not specified in `cactus/examples/discounted-cartrade/config/usersetting.json`, the values of `cactus/packages/config/default.json` are used.
5. `$ npm run build`
6. `$ cd ../examples/discounted-cartrade`
7. `$ npm install`
8. Please modify escrow account information etc. for `cactus/examples/discounted-cartrade/config/default.json`.
   - `cartradeInfo.fabric.submitter.certificate`
     - this is admin's certificate
   - `cartradeInfo.fabric.submitter.pkey`
     - this is admin's secret key
   - `cartradeInfo.ethereum.fromAddressPkey`
     - this is from's secret key
   - `cartradeInfo.ethereum.escrowAddress`
     - this is escrow's address
   - `cartradeInfo.ethereum.escrowAddressPkey`
     - this is escrow's secret key
9. `$ npm run build`
10. `$ npm run init-discounted-cartrade`
11. `$ npm run start`
    - if you do this, discounted-cartrade starts to exec on 5034 port.


### How to execute
- a.) Transaction Execution
  - Please run Python script instead of curl (script that runs from data registration with indy to HTTP requests to BLP).
  - To modify the transaction parameters, please modify the `http_req_params = {...}` part of the script `sample _ Userside.py`.
     - please run the following command in an environment where discounted-cartrade is running and python can be run. We have confirmed that the following can be executed in the environment where `python3-indy==1.16.0` and `requests==2.26.0` are installed by the pip command.
   - ```
      $ cp -frp cactus/examples/register-indy-data/req_discounted_cartrade.py indy-sdk/samples/python/src
      $ cd indy-sdk/samples/python
      $ TEST_POOL_IP=172.16.0.2 python -m src.req_discounted_cartrade
      ```
  - A log similar to the following is output to the console:
    - `[2021-07-26T10:15:27.664] [DEBUG] BusinessLogicCartrade - ##isPreferredCustomer result : true`
      - If `##isPreferredCustomer result : true` is output, employee certification part is completed.
    - ```
      [2020-08-21T19:55:24.207] [INFO] TransactionManagement - tradeID: 20200821195524-001
      [2020-08-21T19:55:24.282] [INFO] BusinessLogicCartrade - firstTransaction txId : 0xafe7c812ab55c02feb691d2133bbba2c38abaf7f221794c3ca833a29708f4653
      [2020-08-21T19:56:20.005] [INFO] BusinessLogicCartrade - ##INFO: underEscrow -> underTransfer, businessLogicID: guks32pf, tradeID: 20200821195524-001
      [2020-08-21T19:56:20.608] [INFO] BusinessLogicCartrade - secondTransaction txId : 17c7577f73560ea5955f3151ed678833aa45d1252b34c6f933a7123757e82969
      [2020-08-21T19:56:23.691] [INFO] BusinessLogicCartrade - ##INFO: underTransfer -> underSettlement, businessLogicID: guks32pf, tradeID: 20200821195524-001
      [2020-08-21T19:56:23.703] [INFO] BusinessLogicCartrade - thirdTransaction txId : 0x61acb066349e24319afdf272b35429d198046e10f8fca3972f17a9e9a4dca75d
      [2020-08-21T19:56:31.518] [INFO] BusinessLogicCartrade - ##INFO: completed cartrade, businessLogicID: guks32pf, tradeID: 20200821195524-001
      ```
      - If `##INFO: completed cartrade` is output, cartrade part is completed.

- b.) Transaction Reference
  - `$ curl localhost:5034/api/v1/bl/trades/XXXXXXXXXXXXXX-XXX -XGET`

- c.) Login
  - `$ curl localhost:5034/api/v1/bl/login/ -XPOST -H "Content-Type: application/json" -d '{"userid":"user01","pwd":"hoge"}'`

- d.) Balance Confirmation
  - `$ curl localhost:5034/api/v1/bl/balance/9d624f7995e8bd70251f8265f2f9f2b49f169c55`
    - At the end of the URL, specify the account.

- e.) QueryCar
  - `$ curl localhost:5034/api/v1/bl/cars/CAR1 -XGET`

- f.) QueryAllCars
  - `$ curl localhost:5034/api/v1/bl/cars/ -XGET`

- g.) GetAsset (`contractInfo.json` must be replaced)
  - `contractInfo.json` is still a sample file and should be replaced when confirming operation.
  - `$ curl localhost:5034/api/v1/bl/asset/ -XGET`

- h.) AddAsset (`contractInfo.json` must be replaced)
  - `contractInfo.json` is still a sample file and should be replaced when confirming operation.
  - `$ curl localhost:5034/api/v1/bl/asset/ -XPOST -H "Content-Type: application/json" -d '{"amount":100}'`

- i.) Executing Template Functions (execSyncFunction)
  - ```
    $ curl localhost:5034/api/v1/bl/template-trade/execSyncFunction/ -XPOST -H "Content-Type: application/json" -d '{"template": "name", "args": {"tokenID": "token-12345", "contractID": "contract-123456"}}'
    $ curl localhost:5034/api/v1/bl/template-trade/execSyncFunction/ -XPOST -H "Content-Type: application/json" -d '{"template": "symbol", "args": {"tokenID": "token-12345", "contractID": "contract-123456"}}'
    $ curl localhost:5034/api/v1/bl/template-trade/execSyncFunction/ -XPOST -H "Content-Type: application/json" -d '{"template": "decimals", "args": {"tokenID": "token-12345", "contractID": "contract-123456"}}'
    $ curl localhost:5034/api/v1/bl/template-trade/execSyncFunction/ -XPOST -H "Content-Type: application/json" -d '{"template": "totalSupply", "args": {"tokenID": "token-12345", "contractID": "contract-123456"}}'
    $ curl localhost:5034/api/v1/bl/template-trade/execSyncFunction/ -XPOST -H "Content-Type: application/json" -d '{"template": "balanceOf", "args": {"tokenID": "token-12345", "contractID": "contract-123456"}}'
    ```

- j.)  Executing Template Functions (sendSignedTransaction)
  - `$ curl localhost:5034/api/v1/bl/template-trade/sendSignedTransaction/ -XPOST -H "Content-Type: application/json" -d '{"template": "transfer", "args": {"_from": "account001", "_to": "account002", "value": 1000, "tokenID": "token-12345", "contractID": "contract-123456"}}'`

- k.) nop-sample
  - `$ curl localhost:5034/api/v1/bl/nop-sample/ -XGET`

- l.) how to check

  - How to check account balance
    - `unit_test/validatorDriver_getNumericBalance.js`
    - ex.) `$ node validatorDriver_getNumericBalance.js`
      - The balance for the account appears in the Validator console as follows:
      - `[2020-08-18T17:06:15.795] [INFO] connector_main[6710] - Response　:{"status":200,"amount":1900}`
  - How to check the car owner
    - `unit_test/queryCar.js`
    - ex.) `$ node queryCar.js CAR1`
      - The Car owner appears in the Validator console as follows:
      - `##queryCar Params: CAR1`
      - Transaction has been evaluated, result is: `{"colour":"red","make":"Ford","model":"Mustang","owner":"fuser02"}`.
  - How to change car ownership
    - `unit_test/validatorDriver_signTransactionOffline.js`
