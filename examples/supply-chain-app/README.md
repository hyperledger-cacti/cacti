# Hyperledger Cactus Example - Supply Chain App


## Usage

1. Build the project as instructed by the [BUILD.md](../../BUILD.md) file.
2. Execute the following while standing in the project root directory:
    ```sh
    git clone https://github.com/hyperledger/cactus.git
    cd cactus
    npm install
    npm run configure
    cd examples/supply-chain-app
    rm -rf node_modules/
    rm package-lock.json
    npm install --no-package-lock
    npm start
    ```
3. Observe the example application pulling up
   1. the test ledger containers,
   2. a test consortium with multiple members and their Cactus nodes