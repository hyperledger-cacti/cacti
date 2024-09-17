# @hyperledger-cacti/cacti-plugin-copm-corda

Implements COPM primitives for Corda as a cacti plugin.  The implementation follows the model of the Corda ledger connector plugin, where a typescript pass-through implementation is registered on the plugin server, and commands are implemented on a separate grpc server in the Kotlin Spring framework.  

Command documentation as OpenAPI:
https://hyperledger-cacti.github.io/cacti/references/openapi/cacti-copm-core_openapi/

The kotlin implementation is divided into a base package, org.hyperledger.cacti.plugin.copm, and a sample implementation, 
com.copmCorda.  The com.copmCorda package specifies the application-specific implementation using the weaver
sample code.

These endpoints require the following:

- weaver relays and drivers to be deployed on the network
- chaincode contracts supporting 'asset exchange' and 'asset transfer' to be deployed on the corda network
  
Please see https://hyperledger-cacti.github.io/cacti/weaver/introduction/.

# Usage

## Installation

Yarn: 

    yarn add --exact @hyperledger-cacti/cacti-plugin-copm-corda

In a production scenario the kotlin server should be deployed and reachable from the cacti server plugin. Please see
the Dockerfile in src/test as an example.

## Configuration

The following application-specific interfaces must be implemented:

  - CordaConfiguration - provides information on how local asset contracts and user accounts are configured
  - InteropConfiguration - provides information on how remote networks are configured

These implementations should be marked as Spring components, as shown in the example implementation in src/test. 

## Development

Please see [the cacti-cop-test README](./../cacti-copm-test/README.md) for details on building a 
corda test network.
