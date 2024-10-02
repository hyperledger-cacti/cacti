# Hyperledger Cactus Example - CBDC Bridging between Fabric and Besu Backend

## Running the Test Suites

> Make sure you have all the dependencies set up as explained in `BUILD.md`

On the terminal, issue the following commands in the project root:

1. `yarn run configure`
2. `yarn run start:example-cbdc-bridging-app`

Wait for the output to show the message `CbdcBridgingApp running...`

In a second terminal run the following commands from the project root:
3. `cd examples/cactus-example-cbdc-bridging-backend`
4. `yarn run test`

## Running the Example Application Locally

> Make sure you have all the dependencies set up as explained in `BUILD.md`

On the terminal, issue the following commands:

1. `yarn run configure`
2. `yarn run start:example-cbdc-bridging-app`

Wait for the output to show the message `CbdcBridgingApp running...`

## Running with a different configuration

There is a `process.env` file where you can change the following variables:
```
API_HOST=localhost // the path where the backend will be running
API_SERVER_1_PORT=4000 // port assign to the FabricConnectorApi
API_SERVER_2_PORT=4100 // port assign to the BesuConnectorApi
API_GATEWAY_1_BLO_PORT=4010 // port assign to the Gateway1's OpenApi Service
API_GATEWAY_2_BLO_PORT=4110 // port assign to the Gateway2's SATP Service
API_GATEWAY_1_CLIENT_PORT=3011 // port assign to the Gateway1's SATP Client Service
API_GATEWAY_2_CLIENT_PORT=3111 // port assign to the Gateway2's SATP Client Service
API_GATEWAY_1_SERVER_PORT=3010 // port assign to the Gateway1's SATP Server Service
API_GATEWAY_2_SERVER_PORT=3110 // port assign to the Gateway2's SATP Server Service
```

## Debugging the Example Application Locally

On the terminal, issue the following commands (steps 1 to 6) and then perform the rest of the steps manually.

1. `yarn run configure`
2. Locate the `.vscode/template.launch.json` file
3. Within that file locate the entry named `"Example: CBDC Bridging Fabric-EVM App"`
4. Copy the VSCode debug definition object from 2) to your `.vscode/launch.json` file
5. At this point the VSCode `Run and Debug` panel on the left should have an option also titled `"Example: CBDC Bridging Fabric-EVM App"` which starts the application
6. Wait for the output to show the message `CbdcBridgingApp running...`
