# cactus-check-connection-ethereum-validator

Business Logic Plugin for checking communication with ethereum ledger via cactus-plugin-ledger-connector-go-ethereum-socketio

### Setup 

Before booting, prepare the directory on your server for storing config files
    
    sudo mkdir /etc/cactus
    sudo chmod 777 /etc/cactus
    

### Start docker environment for Go-Ethereum testnet
    
    cd cactus/tools/docker/geth-testnet
    ./script-start-docker.sh
    
### Build all necessary packages

In main cactus directory run

    npm run configure

### Launch ethereum connector

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

### Launch  socket server and BLP

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

### How to use

Application checks connection by getting balance on ethereum ledger
Test account address is: 
    
    06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97
    

To execute BLP run:
    
    curl localhost:5034/api/v1/bl/check-ethereum-validator -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"jLn76rgB"}'
    

To check balance on Ethereum ledger run:

    
    curl localhost:5034/api/v1/bl/check-ethereum-validator/06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97
    

# Testing

### Test cases

1. Check if all services (ledger, connector and BLP) are available
2. Check if containers (ledger, connector) are up and running
3. Check connection to BLP and received response
4. Check connection BLP -> connector -> ledger

### How to run

For testing purpose test suite is getting ip address from /etc/cactus/usersetting.yaml
Change value hostName in above file before running test suite

To run testsuite:

1. In cactus/jest.config.js comment line:

    ```
    `./examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-connection-to-ledger.test.ts`,

    ```
2. In main cactus directory run:
    ```
    npx jest examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-connection-to-ledger.test.ts
    ```