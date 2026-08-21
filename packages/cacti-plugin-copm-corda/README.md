# `@hyperledger-cacti/cacti-plugin-copm-corda`

## Overview

Implements COPM primitives for Corda as a cacti plugin.  The implementation follows the model of the Corda ledger connector plugin, where a typescript pass-through implementation is registered on the plugin server, and commands are implemented on a separate grpc server in the Kotlin Spring framework.  

**Target Audience:**

- [x] Developers
- [x] Operators

Command documentation as OpenAPI:
https://hyperledger-cacti.github.io/cacti/references/openapi/cacti-copm-core_openapi/

The kotlin implementation is divided into a base package, org.hyperledger.cacti.plugin.copm, and a sample implementation, 
com.copmCorda.  The com.copmCorda package specifies the application-specific implementation using the weaver
sample code.

These endpoints require the following:

- weaver relays and drivers to be deployed on the network
- chaincode contracts supporting 'asset exchange' and 'asset transfer' to be deployed on the corda network
  
Please see https://hyperledger-cacti.github.io/cacti/weaver/introduction/.

## Install

```sh
npm install @hyperledger-cacti/cacti-plugin-copm-corda
```

## Configuration

The TypeScript plugin accepts the following constructor options:

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `instanceId` | Yes | None | Unique identifier for the plugin instance. |
| `copmKotlinServerBaseUrl` | Yes | None | Base URL of the Kotlin ConnectRPC server. |
| `logLevel` | No | `"INFO"` | Plugin log level. |

The Kotlin service requires application-specific implementations of
`CordaConfiguration` and `InteropConfiguration`. Register those
implementations as Spring components, as demonstrated by the test application.

## API Summary

The plugin registers the COPM `DefaultService` ConnectRPC contract from
`@hyperledger-cacti/cacti-copm-core` and forwards calls to the configured
Kotlin server. See the [COPM OpenAPI reference](https://hyperledger-cacti.github.io/cacti/references/openapi/cacti-copm-core_openapi/).

## Usage

In a production scenario the kotlin server should be deployed and reachable from the cacti server plugin. Please see
the Dockerfile in src/test as an example.

### Kotlin service configuration

The following application-specific interfaces must be implemented:

  - CordaConfiguration - provides information on how local asset contracts and user accounts are configured
  - InteropConfiguration - provides information on how remote networks are configured

These implementations should be marked as Spring components, as shown in the example implementation in src/test. 

## Development

See the [cacti-copm-test README](../cacti-copm-test/README.md) for details on
building a Corda test network.

## Testing

The package does not define a standalone test command. Its sample Kotlin server
and Corda integration are exercised through the
[`cacti-copm-test`](../cacti-copm-test/README.md) network and integration
suite.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in
the [LICENSE](../../LICENSE) file.
