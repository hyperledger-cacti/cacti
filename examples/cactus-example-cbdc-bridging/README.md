# Hyperledger Cactus Example - CBDC Bridging between Fabric and Besu

## Running the backend

> Make sure you have all the dependencies set up as explained in `BUILD.md`

On the terminal, issue the following commands in the project root:

1. `npm run configure`
2. `npm run start:example-cbdc-bridging-app`

Wait for the output to show the message `CbdcBridgingApp running...`

## Running the frontend

The source code of the frontend is not yet available, however, we provide a Docker image.

In a second terminal run:

`docker run -p 2000:2000 aaugusto11/cactus-example-cbdc-bridging-frontend`

Visit `localhost:2000` and interact with the application. Do not change the port in your local machine, otherwise, the api servers might reject the requests.