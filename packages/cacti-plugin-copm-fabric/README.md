# @hyperledger/cacti-plugin-copm-fabric

This cactus plugin implements a connectRPC server for the fabric COPM implementation.

Command documentation as OpenAPI:
https://jenniferlianne.github.io/cacti/references/openapi/cacti-copm-core_openapi/

These endpoints require the following:

- weaver relays and drivers to be deployed on the network
- chaincode contracts for 'asset exchange' and 'asset transfer' to be deployed on the fabric network
  
Please see https://hyperledger.github.io/cacti/weaver/introduction/.


# Usage

## Installation

Yarn: 

    yarn add --exact @hyperledger/cacti-plugin-copm-fabric


## Configuration

The following application-specific interfaces must be implemented:

-  FabricConfiguration
   -    getConnectionProfile(orgKey: string): object;
   -    getContractContext(orgKey: string): Promise<FabricContractContext>;
   -    getOrgWallet(orgKey: string): Promise<Wallet>;

-  InteropConfiguration (from cacti-copm-common)
   -    getLocalRelayConfig(orgKey: string): LocalRelayConfig;
   -    getRemoteNetworkConfig(remoteOrgKey: string): RemoteNetworkConfig;

  These implementations are then supplied to the plugin constructor. 

## Development

A Makefile is provided which will build a docker weaver network with the following commands:

- make setup
  - build all weaver components
- make pledge-network
  - makes a network for running pledge/claim (asset transfer)
- make lock-network
  - makes a network for running lock/claim (asset exchange)
- make clean-network
  - tear down the current network
  
The asset exchanges and asset transfer network modes are currently mutually exclusive.
  
  