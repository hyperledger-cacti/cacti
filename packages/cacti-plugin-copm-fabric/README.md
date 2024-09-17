# @hyperledger-cacti/cacti-plugin-copm-fabric

This cactus plugin implements a connectRPC server for the fabric COPM implementation.

Command documentation as OpenAPI:
https://hyperledger-cacti.github.io/cacti/references/openapi/cacti-copm-core_openapi/

These endpoints require the following:

- weaver relays and drivers to be deployed on the network
- chaincode contracts for 'asset exchange' and 'asset transfer' to be deployed on the fabric network
  
Please see https://hyperledger-cacti.github.io/cacti/weaver/introduction/.


# Usage

## Installation

Yarn: 

    yarn add --exact @hyperledger-cacti/cacti-plugin-copm-fabric


## Configuration

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

## Development

Please see [the cacti-cop-test README](./../cacti-copm-test/README.md) for details on building a 
fabric test network.

  
  