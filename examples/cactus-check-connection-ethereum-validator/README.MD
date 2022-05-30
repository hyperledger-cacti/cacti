# cactus-check-connection-ethereum-validator

Business Logic Plugin for checking communication with ethereum ledger via cactus-plugin-ledger-connector-go-ethereum-socketio

-------------------------------------------------------------------------
## 1. Setup 

Before booting, prepare the directory on your server for storing config files
    
    sudo mkdir /etc/cactus
    sudo chmod 777 /etc/cactus
    

#### Start docker environment for Go-Ethereum testnet
    
    cd cactus/tools/docker/geth-testnet
    ./script-start-docker.sh
    
#### Build all necessary packages

In main cactus directory run

    npm run configure

#### Launch ethereum connector

1. Install npm packages and build them
    ```
    cd cactus/packages/cactus-plugin-ledger-connector-go-ethereum-socketio
    npm install
    npm run build
    ```

2. Create symbolic link to node_modules
    ```
    npm run init-ethereum
    ```

3. Create docker image
    ```
    docker-compose -f docker-compose.yaml build
    ```

4. Launch container
    ```
    docker-compose -f docker-compose.yaml up
    ```

#### Launch  socket server and BLP

1. Install and build npm packages on cactus-cmd-socketio-server
    ```
    cd cactus/packages/cactus-cmd-socketio-server
    npm install
    npm run build
    ```

2. Install and build npm packages on cactus/examples/cactus-check-connection-ethereum-validator
    ```
    cd cactus/examples/cactus-check-connection-ethereum-validator
    npm install
    npm run build
    ```

3. Create the symbolic link to node_modules.
    ```
    cd cactus/examples/cactus-check-connection-ethereum-validator
    npm run init-check-connection-ethereum-validator
    ```

4. Launch BLP
    ```
    cd cactus/examples/cactus-check-connection-ethereum-validator
    npm run start
    ```

### Setup tool
Alternative way of setup blp is to use setup tool located in `tools` directory:
    
    cactus/examples/cactus-check-connection-ethereum-validator/tools/


Full setup of blp with needed environment is made with 4 following steps: 

##### 1. Setup environment:
This step consists of:

- checking `/etc/cactus` directory for availability
- checking permissions on above directory and changes them to proper ones
- starting ethereum testnet
- running `npm run configure` in main cactus directory

In `tools` directory run command `./setup.sh -s env`

##### 2. Setup connector
This step consists of:

- building Ethereum connector
- running Ethereum connector

1. Open new terminal window
2. In `tools` directory run command: `./setup.sh -s connector`

##### 3. build socket.io server
1. Open new terminal window
2. In `tools` directory run command: `./setup.sh -s build_socketio_server`

##### 4. Setup BLP
This step consists of:

- building cactus-check-connection-ethereum-validator BLP
- running cactus-check-connection-ethereum-validator BLP

In `tools` directory run command: `./setup.sh -s blp`  

##### To check help run:

    ./setup.sh help
-------------------------------------------------------------------------

## 2. How to use

Application checks connection by getting balance on ethereum ledger
Source test account address is: 
    
    06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97

Destination test account address is:

    9d624f7995e8bd70251f8265f2f9f2b49f169c55
    

To execute BLP run:
    
    curl localhost:5034/api/v1/bl/check-ethereum-validator -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"jLn76rgB"}'
    

To check balance (async request) on Ethereum ledger run:

    curl localhost:5034/api/v1/bl/check-ethereum-validator/getBalance -XPOST -H "Content-Type: application/json" -d '{"account": "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97", "requestType": "async"}'

To check balance (sync request) on Ethereum ledger run:

    curl localhost:5034/api/v1/bl/check-ethereum-validator/getBalance -XPOST -H "Content-Type: application/json" -d '{"account": "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97", "requestType": "sync"}'

To transfer assets between two Ethereum accounts (async request) run:

    curl localhost:5034/api/v1/bl/check-ethereum-validator/transferAssets -XPOST -H "Content-Type: application/json" -d '{"srcAccount": "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97", "destAccount": "9d624f7995e8bd70251f8265f2f9f2b49f169c55", "amount": "10", "requestType": "async"}'

To transfer assets between two Ethereum accounts (sync request) run:

     curl localhost:5034/api/v1/bl/check-ethereum-validator/transferAssets -XPOST -H "Content-Type: application/json" -d '{"srcAccount": "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97", "destAccount": "9d624f7995e8bd70251f8265f2f9f2b49f169c55", "amount": "10", "requestType": "sync"}'

BLP starts by default with Monitor Mode active, but it can be changed by switching monitorMode flag in:

    /etc/cactus/default.yaml

To stop Monitor Mode manually run:

    curl localhost:5034/api/v1/bl/check-ethereum-validator/stopMonitor

To start Monitor Mode manually run:

    curl localhost:5034/api/v1/bl/check-ethereum-validator/startMonitor

-------------------------------------------------------------------------
## 3. Testing

#### Test cases

check-connection-to-ledger.test.ts:
    1. Check if all services (ledger, connector and BLP) are available
    2. Check if containers (ledger, connector) are up and running
    3. Check connection to BLP and received response
    4. Check connection BLP -> connector -> ledger (sync/async)
    5. Make sample transaction between two Ethereum accounts (sync/async)

check-config-files.ts:
    1. Check and validate default.yaml
    2. Check and validate usersetting.yaml

#### How to run

For testing purpose test suite is getting ip address from /etc/cactus/usersetting.yaml
Change value hostName in above file before running test suite

To run testsuites:

1. In cactus/jest.config.js comment lines:

    ```
    ./examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-connection-to-ledger.test.ts,
    ./examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-config-files.test.ts,
    ```
2. In main cactus directory run:
    ```
    npx jest examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-connection-to-ledger.test.ts
    npm jest examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-config-files.test.ts
    ```
You can also use setup script located in `tools` directory:

    cactus/examples/cactus-check-connection-ethereum-validator/tools/

To run single test suite run one of the following commands:

    ./test-runner.sh -t test_connection
    ./test-runner.sh -t test_configs

All available tests can be run with command:

    ./test-runner.sh -t all