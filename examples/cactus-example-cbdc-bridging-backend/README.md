# Hyperledger Cactus Example - CBDC Bridging between Fabric and Besu Backend

## Running the Test Suites

> Make sure you have all the dependencies set up as explained in `BUILD.md`

On the terminal, issue the following commands in the project root:

1. `npm run configure`
2. `npm run start:example-cbdc-bridging-app`

Wait for the output to show the message `CbdcBridgingApp running...`

In a second terminal run the following commands from the project root:
3. `cd examples/cactus-example-cbdc-bridging-backend`
4. `npm run test`

## Running the Example Application Locally

> Make sure you have all the dependencies set up as explained in `BUILD.md`

On the terminal, issue the following commands:

1. `npm run configure`
2. `npm run start:example-cbdc-bridging-app`

Wait for the output to show the message `CbdcBridgingApp running...`

## Debugging the Example Application Locally

On the terminal, issue the following commands (steps 1 to 6) and then perform the rest of the steps manually.

1. `npm run configure`
2. Locate the `.vscode/template.launch.json` file
3. Within that file locate the entry named `"Example: CBDC Bridging Fabric-EVM App"`
4. Copy the VSCode debug definition object from 2) to your `.vscode/launch.json` file
5. At this point the VSCode `Run and Debug` panel on the left should have an option also titled `"Example: CBDC Bridging Fabric-EVM App"` which starts the application
6. Wait for the output to show the message `CbdcBridgingApp running...`
