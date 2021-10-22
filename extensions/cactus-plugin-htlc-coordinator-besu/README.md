# `@hyperledger/cactus-plugin-htlc-coordinator-besu`

Allows Cactus nodes to interact beetwen diferent networks. Using this we can perform:
* Instantiate an existing HTLC plugin, also the own HTLC and the counterparty HTLC.
* Interact with the HTLC, deploying, checking and withdrawing the funds.
## Summary

  - [Usage](#usage)
  - [Development](#development)
    - [Getting Started](#getting-started)
    - [Flow](#flow)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Usage

To use this import public-api and create new **PluginFactoryHTLCCoordinatorBesu*. Then use it to create a HTLC Coordinator.
```typescript
    const factoryHTLC = new PluginFactoryHTLCCoordinatorBesu({
        pluginImportType: PluginImportType.Local,
    });
    const pluginHTLCCoordinatorBesu = await factoryHTLC.create(pluginOptions);
```
You can make calls through the htlc coordinator to the plugin API:

```typescript
async ownHTLC(ownHTLCRequest: OwnHTLCRequest): Promise<InvokeContractV1Response>; 
async counterpartyHTLC(counterpartyHTLCRequest: CounterpartyHTLCRequest): Promise<InvokeContractV1Response>;
async withdrawCounterparty(withdrawCounterpartyRequest: WithdrawCounterpartyRequest): Promise<InvokeContractV1Response>;
```

Call example to create an ownHTLC and instantiate a HTLC contract:
```typescript
    const ownHTLCRequest: OwnHTLCRequest = {
        htlcPackage: HtlcPackage.BesuErc20,
        connectorInstanceId,
        keychainId,
        constructorArgs: [],
        web3SigningCredential,
        inputAmount: 10,
        outputAmount: 1,
        expiration,
        hashLock,
        tokenAddress,
        receiver,
        outputNetwork: "BTC",
        outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
        gas: estimatedGas,
    };
    const response = await coordinator.ownCoordinator(ownHTLCRequest);
});
```
The field "htlcPackage" can have the following values:
```typescript
    enum HtlcPackage {
        Besu = 'BESU',
        BesuErc20 = 'BESU_ERC20'
    }
```

## Development

### Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

#### Prerequisites

In the root of the project to install the dependencies execute the command:
```sh
yarn run configure
```

#### Compiling

In the project root folder, run this command to compile the plugin and create the dist directory:
```sh
yarn run watch
```

### Flow

#### Alice flow

The [Alice diagram](docs/flow/htlc-coordinator-alice-flow.md, "Alice Flow") shows the sequence diagram of a complete flow for a participant who wants exchange funds with another participant. She doesn't start the withdraw flow becuase she doesn't know the secret to withdraw them.

#### Bob flow

The next [Bob diagram](docs/flow/htlc-coordinator-bob-flow.md, "Bob Flow") 
shows the sequence diagram of a complete flow for a participant who wants exchange funds with another participant, but he knows the secret and starts the flow to withdraw the funds.


## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

