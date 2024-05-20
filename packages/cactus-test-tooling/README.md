# `@hyperledger/cactus-test-tooling`

> TODO: description

## Usage

```
// TODO: DEMONSTRATE API
```

## Docker image for the ws-identity server

A docker image of the [ws-identity server](https://hub.docker.com/repository/docker/brioux/ws-identity) is used to test integration of WS-X.509 credential type in the fabric connector plugin.

[ws-identity](https://github.com/brioux/ws-identity) includes A Docker file to build the image:
clone the repo, install packages, build src and the image

```
npm install
npm run build
docker build . -t [image-name]
```

## Stellar Test Ledger Usage

The Stellar test ledger follows the same structure present in the test ledger tools for other networks within the Cacti project. It pulls up and manages the [Stellar Quickstart Docker Image](https://github.com/stellar/quickstart) and can be used by importing the class `StellarTestLedger`, then instantiating it with some key optional arguments to define how the image should be configure.

- `network`: Defines if the image should pull up a pristine local ledger or alternatively connect to an existing public test ledger. Defaults to `local`. It is important to note that connecting to an existing network can take up to several minutes to synchronize the ledger state.

- `limits`: Defines the resource limits for soroban smart contract transactions. A valid transaction and only be included in a ledger block if enough resources are available for that operation. Defaults to `testnet`, which mimics the actual resource limits applied to the mainnet based on its test environment.

Once the class is successfully instantiated, one can start the environment by triggering

```typescript
await stellarTestLedger.start();
```

The image will be pulled up and wait until the healthcheck ensures all of its services have started successfully and are accessible, then returns the container object.

When integrating to a Stellar environment, it is common to use a few key services provided at different ports and paths. Once the class has been started, one can use the method `getNetworkConfiguration()` to get an object containing the required information to connect to this services.

This object is already formatted to be used with the [stellar-plus](https://github.com/CheesecakeLabs/stellar-plus) open source js library to create a custom network configuration object that integrates with its provided tools, ensuring a frictionless development flow for this test ledger.

Once the image have been fully utilized, one can fully stop and remove the environment by triggering

```typescript
await stellarTestLedger.stop();
await stellarTestLedger.destroy();
```
