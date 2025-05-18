# Hyperledger Cacti Workshop 2022-11-14 Examples

This folder contains several simple examples using different components of Hyperledger Cacti that are used in the first Hyperledger workshop dedicated to interoperability, using Cacti: https://wiki.hyperledger.org/display/events/Blockchain+Interoperability+with+Hyperledger+Cacti

## Hyperledger Cacti Workshop Examples - Hello World
WARNING: This code IS NOT production-ready nor secure! Namely, cross-site scripting is possible if user input is not sanitized.

``src/main/typescript/hello-world.ts``

Creates an APIServer listening on port 3001 that exposes the endpoints of the ingested plugins - for demonstration purposes we use only one plugin, the cactus-plugin-object-store-ipfs. This plugin interacts with an underlying IPFS network (a simple key-value store).

Run the file with the following command ``npx ts-node src/main/typescript/hello-world.ts``

To interact with the IPFS connector through the APIServer follow the next commands:
- POST `/api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/set-object`, which sets a new key-value pair.
    ```
    curl --header "Content-Type: application/json" \
        --request POST \
        --data '{"key":"1234","value":"xyz"}' \
        http://localhost:3001/api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/set-object
    ```

- POST `/api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/get-object`, which gets a key-value pair.
    ```
    curl --header "Content-Type: application/json" \
        --request POST  \
        --data '{"key":"1234"}' \
        http://localhost:3001/api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/get-object
    ```

- GET "/has-object", which checks if a key-value pair exits in the client.
    ```
    curl --header "Content-Type: application/json" \
        --request POST  \
        --data '{"key":"1234"}' \
        http://localhost:3001/api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/has-object
    ```

*NOTE: other carachters might appear in the output of the commands since we should insert the values in base64. For demo purposes we don't make the conversion.*

## Hyperledger Cacti Workshop Examples - Simple Consortium

``src/main/typescript/test-ledger.ts``

Creates a simple Cacti Consortium.

Runs with the following command ``npx ts-node src/main/typescript/simple-consortium.ts``

## Hyperledger Cacti Workshop Examples - Substrate test ledger

``src/main/typescript/test-ledger.ts``

Creates a substrate test ledger programmatically.

Runs with the following command ``npx ts-node src/main/typescript/test-ledger.ts``

## Known issues
This example package works with version 1.0.0 of ``@hyperledger/cactus-test-tooling``. It will work with the most recent version once #2213 is resolved.

## Authors

- Rafael Belchior
- Mónica Gomez
- Abhinav Srivastava
- André Augusto