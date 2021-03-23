<!--
 Copyright 2021 Hyperledger Cactus Contributors
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# validatorDriver

## Abstract
This is the WebAPI version of Driver that calls Validator.  Driver is called as WebAPI over HTTP.

## Premise
- Validators for Ethereum and Fabric are already running
- Before running this driver, copy the "wallet" of fabcar into the following direcotries:
    - `sample01-car-trade/validatorDriver`
    - `sample01-car-trade/validatorDriver/dist/core`
- (NOTICE): The above operation means that the wallet copied for using the unit-test of Fabric validator has to copied the above directories:   
- The current directory is the following 
    - `sample01-car-trade/validatorDriver`

## How to launch

### 1) Execute after git-clone
- `npm install`

### 2) Build TypeScript codes
- `npm run build`

### 3) Launch Driver(WebAPI)
- `cd dist/core/`
- `node ./bin/www.js`
    - The `www.js` script uses the port 5000.

## How to call Driver(WebAPI)

### a) Start and stop ledger monitors on Validator
- Execute the following curl commands:
    ```
    curl "http://localhost:5000/validatorDriver?validator=fabric&func=getApiList"
    curl "http://localhost:5000/validatorDriver?validator=fabric&func=startMonitor"
    curl "http://localhost:5000/validatorDriver?validator=fabric&func=stopMonitor&param=x"
    (*) Specify the parameter "x" of "param=x" as "id" of the response of startMonitor.
    ```

    ```
    curl "http://localhost:5000/validatorDriver?validator=ethereum&func=getApiList"
    curl "http://localhost:5000/validatorDriver?validator=ethereum&func=startMonitor"
    curl "http://localhost:5000/validatorDriver?validator=ethereum&func=stopMonitor&param=x"
    (*) Specify the parameter "x" of "param=x" as "id" of the response of startMonitor.
    ```

### b) Make signed transactions and send it

- Script: `testDriver_sendRawTransaction.js` (for `sendRawTransaction` on Ethereum Validator)
    - Specify the following parameters when this script is launched
        ```
        var fromAddress = "ec709e1774f0ce4aba47b52a499f9abaaa159f71";
        var fromAddressPkey = "40d7e5931a6e0807d3ebd70518f635dbf575975d3bb564ff34c99be416067c89";
        var toAddress = "9d624f7995e8bd70251f8265f2f9f2b49f169c55";
        var amount = 50;
        ```
- Script: `testDriver_sendSignedProposal.js` (for `sendSignedProposal` on Fabric Validator)
    - Specify the following parameters when this script is launched
        ```
        var carId = "CAR101";
        var newOwner = "Charlie111";
        ```

#### Prepare before executing the scripts

- Change the following environment values

    ```
    const basic_network_path = "/xxxxx/xxxx/unit-test/fabric-docker/basic-network";
    (*) the path of basic-network of fabric/sample
    const privateKeyPath0 = basic_network_path + '/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/c75bd6911aca808941c3557ee7c97e90f3952e379497dc55eb903f31b50abc83_sk';
    (*) it is needed to change the part "c75bd6911aca808941c3557ee7c97e90f3952e379497dc55eb903f31b50abc83_sk" as your environment
    const privateKeyPath = walletPath + '/admin/6872965e4870c3ab435769ceef8ecc5783b7c670a2c0572b6345cf91af1e43aa-priv';
    (*) it is needed to change the part "6872965e4870c3ab435769ceef8ecc5783b7c670a2c0572b6345cf91af1e43aa-priv" as your environment
    ```
