# Cactus discounted-asset-trade


## Abstract

Cactus discounted-asset-trade is a sample application that calculates asset cost based on customer type. In this application, when the users transfer the asset ownership in the cactus discounted-asset-trade, they present their employee proofs to the asset-owner company to receive an employee discount. We implement the employee proofs by proofs on Hyperledger Indy. Asset ownership is represented by a [asset-transfer-basic](https://github.com/hyperledger/fabric-samples/tree/release-2.2/asset-transfer-basic) chaincodetoken on Hyperledger Fabric, which can be exchanged for ETH currency on a private Ethereum blockchain. This Business Logic Plugin (BLP) application controls a process from employee certification using Hyperledger Indy to payment using Ethereum.

![discounted-asset-trade image](./image/discounted-asset-trade-image.png)

## Scenario

The application works in the following scenario:

### Settings

Alice wants to buy an asset using the services of company Thrift Corp. Alice chose this company because she is an employee of Acme Corp., which offers discounts on Thrift Corp.'s services as a benefit.

**Note** : Acme Corp and Thrift Corp have the same names on the sample application on Hyperledger Indy.

### Preparations

Alice knows that Acme Corp. provides digital certificates. She asks Acme Corp. to issue a credential when she uses various services, and the company issues it.

### When Alice Uses the Service

Alice will use credentials and other Indy formats such as schema and definition to create an employee proof that she will present when purchasing the asset. Alice then sends a purchase order and her employee proof to the Cactus Node Server via an End User Application. The employee proofs consist of proof requests and proofs on Hyperledger Indy. The Cactus Node server receives the schema and definition from the Indy ledger via Validator and uses this information to verify the proof with the BLP. Once verified, the BLP will decide what she should pay based on the price list and then proceed with the business logic using cactus as an escrow to transfer ETH currencies and asset ownership tokens to each other.

## Setup Overview

### fabric-socketio-validator
- Validator for fabric ledger.
- Docker networks: `fabric-all-in-one_testnet-2x`, `cactus-example-discounted-asset-trade-net`

### ethereum-validator
- Validator for ethereum ledger.
- Docker network: `geth1net`, `cactus-example-discounted-asset-trade-net`

### indy-sdk-cli-base-image
- Base image for indy validator.
- It will build the image and immediately exit on run.

### indy-validator
- Validator for indy ledger.
- Assumes ledger runs at `172.16.0.2`
- Docker network: `indy-testnet_indy_net`
- Accessed only by nginx proxy container.

### indy-validator-nginx
- Load balancer / gateway for indy validator.
- Use it's endpoint to talk to indy validator.
- Uses config from `./nginx/nginx.conf`
- Docker network: `indy-testnet_indy_net`, `cactus-example-discounted-asset-trade-net`

### cmd-socketio-base-image
- Base image for `cactus-example-discounted-asset-trade` BLP.
- Contains cactus cmd socketio server module
- It will build the image and immediately exit on run.

### cactus-example-discounted-asset-trade-blp
- Main logic for this sample application.
- Use it's endpoint (`localhost:5034`) to interact the bussiness logic.
- Docker network: `cactus-example-discounted-asset-trade-net`

### register-indy-data
- Setup application.
- Will generate proof and store it in local configuration on startup.
- This application can also be used to send requests to the BLP.

## Indy Schema
![Indy node pool and validator](./image/indy-setup-schema.svg)

## Preparations
1. Configure Cactus:
    ```
    # execute in root cactus dir
    pushd ../..
    npm run configure
    popd
    ```

1. Start the ledgers:
    ```
    ./script-start-ledgers.sh
    ```
    - This script will start all ledger docker containers, networks, and will setup configuration needed to operate the sample app.
    - (NOTICE: Before executing the above, your account needs to be added to the docker group (`usermod -a -G docker YourAccount` from root user))
    - On success, this should start three containers:
        - `geth1`
        - `asset_trade_faio2x_testnet`
        - `indy-testnet-pool`

1. Launch discounted-asset-trade and validators from local `docker-compose.yml` (use separate console for that, docker-compose will block your prompt):
    ```
    docker-compose build && docker-compose up
    # or
    npm run start
    ```

    This will build and launch all needed containers, the final output should look like this:

    ```
    cactus-example-discounted-asset-trade-ethereum-validator | listening on *:5050
    ...
    cactus-example-discounted-asset-trade-fabric-socketio-validator | listening on *:5040
    ...
    cactus-example-discounted-asset-trade-indy-validator | 2022-01-31 16:00:49,552 INFO success: validator entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
    ...
    cactus-example-discounted-asset-trade-indy-validator-nginx | 2022/01/31 16:00:49 [notice] 1#1: start worker process 35
    ...
    cmd-socketio-base-dummy exited with code 0
    ...
    indy-sdk-cli-base-dummy exited with code 0
    ...
    register-indy-data      | Done.
    register-indy-data exited with code 0
    ...
    cactus-example-discounted-asset-trade-blp      | [2022-01-31T16:00:56.208] [INFO] www - listening on *: 5034
    ```

## How to use this application

1. (Optional) Check the balance on Ethereum and the asset ownership on Fabric using the following script:
    ```
    node ./read-ledger-state.js
    ```

    The result looks like the following (simplified output):

    ```
    # Ethereum fromAccount:
    { status: 200, amount: 100000 }

    # Ethereum toAccount:
    { status: 200, amount: 0 }

    # Fabric:
    [
        {
            ...
        },
        {
            ID: 'asset2',
            color: 'red',
            size: 5,
            owner: 'Brad',
            appraisedValue: 400
        },
        ...
    ]
    ```

1. Run the transaction execution using the following script:
    ```
    ./script-post-trade-request.sh
    ```

    ... or send request manually:

    ```
    docker run --rm -ti -v "$(pwd)/etc/cactus/":"/etc/cactus/" --net="host" register-indy-data
    ```

    After this, the transactions are executed by order. When the following log appears on the console where you executed `docker-compose`, the transactions are completed.

    ```
    [INFO] BusinessLogicAssetTrade - ##INFO: completed asset-trade, businessLogicID: guks32pf, tradeID: *******-001
    ```

1. (Optional) Check the balance on Ethereum and the asset ownership on Fabric using the following script
    ```
    node ./read-ledger-state.js
    ```

    The result looks like the following (simplified output). In the following case, 50 coins from `fromAccount` was transferred to `toAccount`, and the asset ownership ("owner") was transferred from Brad to Cathy.

    ```
    # Ethereum fromAccount:
    { status: 200, amount: 99950 }

    # Ethereum toAccount:
    { status: 200, amount: 50 }

    # Fabric:
    [
        {
            ...
        },
        {
            ID: 'asset2',
            color: 'red',
            size: 5,
            owner: 'Cathy',
            appraisedValue: 400
        },
        ...
    ]
    ```

## How to stop the application and Docker containers

1. Press `Ctrl+C` in `docker-compose` console to stop the application.
1. Run cleanup script
    ```
    sudo ./script-cleanup.sh
    ```

#### Manual cleanup instructions

1. Remove the config files on your machine
    ```
    sudo rm -r ./etc/cactus/
    ```
1. Stop the docker containers of Ethereum, Fabric and Indy
    - `docker stop geth1 asset_trade_faio2x_testnet indy-testnet-pool`
    - `docker rm geth1 asset_trade_faio2x_testnet indy-testnet-pool`

1. Clear indy testnet sandbox
    ```
    pushd ../../tools/docker/indy-testnet/
    ./script-cleanup.sh
    popd
    ```
