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

   $ git clone https://github.com/hyperledger/indy-sdk.git

   $ git clone https://github.com/hyperledger/cactus.git

   indy-sdk and cactus must be cloned in the same directory

2. Please modify the container IP information in indy_pool

   Please edit the above cloned indy-sdk/ci/indy-pool.dockerfile

   Please change the IP address on line 95 to "ARG pool_ip = 172.16.0.2"

3. Changing sandbox permissions

   $ cd cactus/tools/docker/indy-testnet/

   $ sudo chown 1000:1000 -R sandbox

   $ ls -n ./sandbox

   - drwxr-xr-x.  6 1000 1000   58  June  8  2021 data
   - ​                          ~~~~~~~~~ It will be fine if it becomes 1000 here.

4. Creating images using docker-compose

   $ docker-compose -f ./docker-compose.yaml build

5. Please create and build containers

   Executing the above command will not return to the console.

   You can exit all three containers with ctrc+c.

   $ docker-compose -f ./docker-compose.yaml up

6. Please check that it is booting properly

    $docker ps

    - please check indy_pool, nginx and valipy are booting

### How to execute INDY validator

Assume the following two directories exist in the same directory:
 - cactus
    - $ git clone https://github.com/hyperledger/cactus.git
 - indy-sdk
    - $ git clone https://github.com/hyperledger/indy-sdk.git

1. Creating and Booting containers

   Executing the above command will not return to the console:

   $ cd cactus/tools/docker/indy-testnet/

   $ docker-compose -f ./docker-compose.yaml up

   - [itaya@10 indy-testnet]$ docker-compose -f ./docker-compose.yaml up

     Starting nginx     ... done

     Starting validator ... done

     Starting indy_pool ... done

2. Please check that it is booting properly

   $ docker ps | grep -e indy_pool -e nginx -e valipy

   - please check indy_pool, nginx and valipy are booting

3. Please exec "sample_Userside.py" at every "docker-compose up"
 - 3-1) please copy "sample_Userside.py" to "indy-sdk/samples/python"

     - $ cd cactus/examples/register-indy-data

       $ cp -frp sample_Userside.py ../../../indy-sdk/samples/python/src
 - 3-2) please exec "sample_Userside.py" in valipy
   
   - $ docker ps | grep valipy
   
    - please check ID 
  
    $ sudo docker exec -it validator bash
  
    $ cd /root/indy-sdk/samples/python
  
    $ TEST_POOL_IP=172.16.0.2 python -m src.sample_Userside > sample_Userside.log 2>&1

4. Please exec INDY validator (in velipy)

   $ cd /root/validator

   $ TEST_POOL_IP=172.16.0.2 python -m main

5. Please exec test driver (in host server)

   $ cd cactus/packages-python/cactus_validator_socketio/testcli

   $ npm install

   $ cp -frp ../../../../indy-sdk/samples/python/sample_Userside.log ./

   $ tail -1 < sample_Userside.log | sed -e 's%INFO:__main__:%%'  > myproof.json

   $ node testsock.js

   - On successful execution, the following console log is output:

     - ##signsignature: ～～～～～～

       Authentication OK



## How to use: discounted-cartrade

### Preparations
- The above commands is executed.
- Starting one Validator
 -- <Indy> "validatorUrl": "https://172.16.0.4:8000"
- The following drivers work properly:
 -- <Indy> testcli/testsock.js
- "sample_Userside.py" is executed in "How to execute INDY validator".

### Creating BLP container
1. Please get branch "master"
2. $ cd cactus/examples/discounted-cartrade/BLP_container
3. $ docker-compose -f docker-compose.yaml up

 - Executing the above command will not return to the console. When "Attaching to blp_container" is displayed, startup is completed. The following steps should be performed on a separate console.

### Booting (in blp_container)
1. $ docker exec -it blp_container bash
2. $ cd ~/cactus/packages
3. $ npm install
4. If you modify the URL of the server for "cactus/packages/config/default.json", create and modify "cactus/examples/discounted-cartrade/config/usersetting.json".
   - applicationHostInfo.hostName
     - this is URL of the host returned in the Location header
   - applicationHostInfo.hostPort
     - this is http server port number
   - For items not specified in "cactus/examples/discounted-cartrade/config/usersetting.json", the values of "cactus/packages/config/default.json" are used.

5. $ npm run build
6. $ cd ../examples/discounted-cartrade
7. $ npm install
8. Please modify escrow account information etc. for "cactus/examples/discounted-cartrade/config/default.json"
   - cartradeInfo.fabric.submitter.certificate
     - this is admin's certificate
   - cartradeInfo.fabric.submitter.pkey
     - this is admin's secret key
   - cartradeInfo.ethereum.fromAddressPkey 
     - this is from's secret key
   - cartradeInfo.ethereum.escrowAddress
     - this is escrow's address
   - cartradeInfo.ethereum.escrowAddressPkey
     - this is escrow's secret key

9. $ npm run build
10. $ npm run init-discounted-cartrade
11. $ npm run start
    - if you do this, discounted-cartrade starts to exec on 5034 port.

### Preparations before executing
Assume there exist "sample_Userside.log" which is a result file of "sample_Userside.py"
1. Go to the directory one level above cactus
2. tail -1 <indy-sdk/samples/python/sample _ Userside.log | sed-e's% INFO in main> myproof.json
3. Replace all " in myproof.json with \" and save
4. Replace all \\" in myproof.json with \\\" and save
5. Remove a line break on the last line of myproof.json.
6. Creates a new file "discounted-cartrade_request_body.json"
7. Please write the following content in "discounted-cartrade_request_body.json"
   - {"businessLogicID":"guks32pf","tradeParams":["0xec709e1774f0ce4aba47b52a499f9abaaa159f71", "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55", "fuser01", "fuser02", "CAR1", "<<the content of myproof.json>>"],"authParams":["<<company name>>"]}

### How to exec this app (in host)
1. Go to the directory one level above cactus

2. $ curl localhost:5034/api/v1/bl/trades/ -XPOST -H "Content-Type: application/json" -d @discounted-cartrade_request_body.json

3. you can see the following logs:

   - [2021-07-26T10:15:27.420] [DEBUG] TransactionIndy - ##getDataFromIndy: result: [object Object]

     [2021-07-26T10:15:27.420] [DEBUG] BusinessLogicCartrade - finish get Data from indy

     [2021-07-26T10:15:27.664] [DEBUG] BusinessLogicCartrade - verify proof: ok

     [2021-07-26T10:15:27.664] [DEBUG] BusinessLogicCartrade - ##isPreferredCustomer result : true
