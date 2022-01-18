# Cactus car-trade

## Abstract

Cactus **car-trade** is a sample application where users can exchange car ownership (represented by Fabcar chaincode tokens on a Hyperledger Fabric blockchain) for ETH currency on a private Ethereum blockchain. The application takes the form of a "business logic plugin" which is a central point of our architecture.

![car-trade image](./images/car-trade-image.png)

## Required software components
- OS: Linux (CentOS7)
- Docker (recommend: v17.06.2-ce or greater)
- Docker-compose (recommend: v1.14.0 or greater)
- node.js v12 (recommend: v12.20.2 or greater)

## Prerequisites

- Available ports:
    - `5034`: the port of `cactus-cmd-socketio-server`
    - `5040`: the port of `cactus-plugin-ledger-connector-fabric-socketio`
    - `5050`: the port of `cactus-plugin-ledger-connector-go-ethereum-socketio`
    - If it is already used, the following processes can be done by changing the port number setting
- Available directory (This directory must be empty):
    - `/etc/cactus`: the directory for storing the config files of `cactus-cmd-socket-server`

## Boot method

1. Before booting, please prepare the directory for storing config files on the directoty `/etc/cactus` on your server
    ```
    sudo mkdir /etc/cactus
    sudo chmod 777 /etc/cactus
    ```

1. Before booting, please modify `applicationHostInfo.hostName` and `applicationHostInfo.hostPort` on `cactus/etc/cactus/default.yaml` to adjust to your environment.
    ```
    vi cactus/etc/cactus/default.yaml

    [cactus/etc/cactus/default.yaml]
    applicationHostInfo:
      hostName: http://aaa.bbb.ccc.ddd # please change hostName to your IP address
      hostPort: 5034 # if you want to change the port number, please change hostPort to the port number which you want to use
    ```

1. Start ledgers:
    ```
    ./script-start-ledgers.sh
    ```
    - (NOTICE: Before executing the above, your account needs to be added to the docker group (`usermod -a -G docker YourAccount` from root user))

1. Please prepare the three consoles on your machine as the following:
    - **console 1**: console for launching `cactus-plugin-ledger-connector-go-ethereum-socketio`
    - **console 2**: console for launching `cactus-plugin-ledger-connector-fabric-socketio`
    - **console 3**: console for launching `cactus-cmd-socketio-server` including `cartrade` business logic application.

1. Launch the validators:
    - Please execute [the boot methods](../../packages/cactus-plugin-ledger-connector-go-ethereum-socketio/README.md#boot-methods) of `cactus-plugin-ledger-connector-go-ethereum-socketio` on the **console 1** using the port `5050`
    - Please execute [the boot methods](../../packages/cactus-plugin-ledger-connector-fabric-socketio/README.md#boot-methods) of `cactus-plugin-ledger-connector-fabric-socketio` on the **console 2** using the port `5040`

2. Launch `cactus-cmd-socketio-server` including `cartrade` business logic application
    - Use the **console 3**
    - Build base npm packages (including `cactus-cmd-socketio-server`) from  cactus root directory
        ```
        npm run configure
        ```
    - Install and build npm packages on `examples/cartrade`
        ```
        cd ./examples/cartrade
        npm install
        npm run build
        ```
    - Launch the `cactus-cmd-socketio-server` including `cartrade` business logic application
        ```
        cd ./examples/cartrade
        npm run start
        ```
    - After executing the above script, `cactus-cmd-socketio-server` is launched on the port `5034`.

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
    ```
    curl localhost:5034/api/v1/bl/trades/ -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"guks32pf","tradeParams":["0x06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97", "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55", "Brad", "Cathy", 50, "CAR1"],"authParams":["none"]}'
    ```
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

1. Stop the validators and `cactus-cmd-socketio-server`
    - Press Ctrl+C on the above the **console 1, 2, and 3**.
1. Remove the config files on your machine
    ```
    sudo rm -r /etc/cactus/
    ```
1. Stop the docker containers of Ethereum and Fabric
    - Press the command `docker stop <CONTAINER ID>` to stop the container corresponding to the above containers which were launched by `./script-start-ledgers.sh` on the boot method. If you want to destroy the docker containers, press the command `docker rm <CONTAINER ID>` after the above.
    - If any other docker containers are not running on your machine, you can destroy the Docker containers only with `docker ps -aq | xargs docker stop` and `docker ps -aq | xargs docker rm`.