# `@hyperledger-cacti/cacti-plugin-copm-fabric`

## Overview

This cactus plugin implements a connectRPC server for the fabric COPM implementation.

**Target Audience:**

- [x] Developers
- [x] Operators

Command documentation as OpenAPI:
https://hyperledger-cacti.github.io/cacti/references/openapi/cacti-copm-core_openapi/

These endpoints require the following:

- weaver relays and drivers to be deployed on the network
- chaincode contracts for 'asset exchange' and 'asset transfer' to be deployed on the fabric network
  
Please see https://hyperledger-cacti.github.io/cacti/weaver/introduction/.

## Install

```sh
npm install @hyperledger-cacti/cacti-plugin-copm-fabric
```

## Configuration

The `IPluginCopmFabricOptions` interface accepts:

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `instanceId` | Yes | None | Unique identifier for the plugin instance. |
| `fabricConfig` | Yes | None | Fabric connection, wallet, contract, and asset-contract configuration. |
| `interopConfig` | Yes | None | Local relay and remote organization configuration. |
| `logLevel` | No | `"INFO"` | Plugin log level. |

The following application-specific interfaces must be implemented:

-  FabricConfiguration
   -    getConnectionProfile(orgKey: string): object;
   -    getContractContext(orgKey: string): Promise\<FabricContractContext\>;
   -    getOrgWallet(orgKey: string): Promise\<Wallet\>;

-  InteropConfiguration (from cacti-copm-common)
   -    getLocalRelayConfig(orgKey: string): LocalRelayConfig;
   -    getRemoteOrgConfig(remoteOrgKey: string): RemoteOrgConfig;
   -    getRemotePledgeStatusCmd(remoteOrgKey: string, ValidatedClaimPledgedAssetRequest): DLTransactionParams;


  These implementations are then supplied to the plugin constructor. 

## API Summary

The plugin implements `IPluginCrpcService` and registers the COPM
`DefaultService` from `@hyperledger-cacti/cacti-copm-core`. Its public API
also exports `PluginCopmFabric`, `FabricConfiguration`,
`FabricTransactionContextFactory`, and `FabricContractContext`.

## Usage

Create `FabricConfiguration` and COPM `InteropConfiguration`
implementations for the target network, then provide them to
`PluginCopmFabric` with a unique `instanceId`.

## Development

See the [cacti-copm-test README](../cacti-copm-test/README.md) for details on
building a Fabric test network.

## Testing

The package does not define a standalone test command. Its Fabric
implementation is exercised through the
[`cacti-copm-test`](../cacti-copm-test/README.md) network and integration
suite.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in
the [LICENSE](../../LICENSE) file.
  