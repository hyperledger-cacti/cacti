# `@hyperledger-cacti/cactus-plugin-htlc-coordinator-besu`

## Overview

This extension coordinates hash time-locked contract (HTLC) operations through
the Besu and Besu ERC-20 HTLC plugins. It locates the required connector and
HTLC plugins in a Cacti `PluginRegistry`, then exposes operations for creating
the initiating and counterparty contracts and withdrawing counterparty funds.

**Target Audience:**

- [x] Developers
- [x] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-plugin-htlc-coordinator-besu
```

## Configuration

The `IPluginHTLCCoordinatorBesuOptions` interface accepts:

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `instanceId` | Yes | None | Unique identifier for the coordinator instance. |
| `pluginRegistry` | Yes | None | Registry containing the Besu connector and HTLC plugins used by requests. |
| `logLevel` | No | `"INFO"` | Coordinator log level. |

## API Summary

The coordinator exposes `ownHTLC`, `counterpartyHTLC`, and
`withdrawCounterparty` operations through both its TypeScript API and OpenAPI
web services. Request and response schemas are defined in the
[OpenAPI specification][package-doc-src-main-json-openapi-json].

## Summary

  - [Usage](#usage)
  - [Development](#development)
    - [Getting Started](#getting-started)
    - [Flow](#flow)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Usage

Import the public API and use `PluginFactoryHTLCCoordinatorBesu` to create a
coordinator:

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
    const response = await pluginHTLCCoordinatorBesu.ownHTLC(ownHTLCRequest);
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

The [Alice diagram][package-doc-docs-flow-htlc-coordinator-alice-flow-md] shows the
sequence for a participant who initiates an exchange but does not know the
secret required to withdraw the counterparty funds.

#### Bob flow

The [Bob diagram][package-doc-docs-flow-htlc-coordinator-bob-flow-md] shows the sequence
for a participant who knows the secret and initiates withdrawal.

## Testing

From the repository root, run:

```sh
yarn test:jest:all extensions/cactus-plugin-htlc-coordinator-besu/src/test/typescript
```

## Contributing

See [CONTRIBUTING.md][package-doc-contributing-md] for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE][package-doc-license] file.

[package-doc-src-main-json-openapi-json]: ./src/main/json/openapi.json
[package-doc-docs-flow-htlc-coordinator-alice-flow-md]: ./docs/flow/htlc-coordinator-alice-flow.md
[package-doc-docs-flow-htlc-coordinator-bob-flow-md]: ./docs/flow/htlc-coordinator-bob-flow.md
[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
