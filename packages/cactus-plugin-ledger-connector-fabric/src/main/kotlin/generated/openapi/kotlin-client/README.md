# org.openapitools.client - Kotlin client library for Hyperledger Cactus Plugin - Connector Fabric

## Requires

* Kotlin 1.4.30
* Gradle 6.8.3

## Build

First, create the gradle wrapper script:

```
gradle wrapper
```

Then, run:

```
./gradlew check assemble
```

This runs all tests and packages the library.

## Features/Implementation Notes

* Supports JSON inputs/outputs, File inputs, and Form inputs.
* Supports collection formats for query parameters: csv, tsv, ssv, pipes.
* Some Kotlin and Java types are fully qualified to avoid conflicts with types defined in OpenAPI definitions.
* Implementation of ApiClient is intended to reduce method counts, specifically to benefit Android targets.

<a name="documentation-for-api-endpoints"></a>
## Documentation for API Endpoints

All URIs are relative to *http://localhost*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*DefaultApi* | [**deployContractGoSourceV1**](docs/DefaultApi.md#deploycontractgosourcev1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/deploy-contract-go-source | Deploys a chaincode contract in the form of a go sources.
*DefaultApi* | [**deployContractV1**](docs/DefaultApi.md#deploycontractv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/deploy-contract | Deploys a chaincode contract from a set of source files. Note: This endpoint only supports Fabric 2.x. The 'v1' suffix in the method name refers to the Cactus API version, not the supported Fabric ledger version.
*DefaultApi* | [**getBlockV1**](docs/DefaultApi.md#getblockv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/get-block | Get block from the channel using one of selectors from the input. Works only on Fabric 2.x.
*DefaultApi* | [**getPrometheusMetricsV1**](docs/DefaultApi.md#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/get-prometheus-exporter-metrics | Get the Prometheus Metrics
*DefaultApi* | [**getTransactionReceiptByTxIDV1**](docs/DefaultApi.md#gettransactionreceiptbytxidv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/get-transaction-receipt-by-txid | get a transaction receipt by tx id on a Fabric ledger.
*DefaultApi* | [**runTransactionV1**](docs/DefaultApi.md#runtransactionv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction | Runs a transaction on a Fabric ledger.


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.ChainCodeLanguageRuntime](docs/ChainCodeLanguageRuntime.md)
 - [org.openapitools.client.models.ChainCodeLifeCycleCommandResponses](docs/ChainCodeLifeCycleCommandResponses.md)
 - [org.openapitools.client.models.ChainCodeProgrammingLanguage](docs/ChainCodeProgrammingLanguage.md)
 - [org.openapitools.client.models.ConnectionProfile](docs/ConnectionProfile.md)
 - [org.openapitools.client.models.ConnectionProfileClient](docs/ConnectionProfileClient.md)
 - [org.openapitools.client.models.DefaultEventHandlerStrategy](docs/DefaultEventHandlerStrategy.md)
 - [org.openapitools.client.models.DeployContractGoSourceV1Request](docs/DeployContractGoSourceV1Request.md)
 - [org.openapitools.client.models.DeployContractGoSourceV1RequestConstructorArgs](docs/DeployContractGoSourceV1RequestConstructorArgs.md)
 - [org.openapitools.client.models.DeployContractGoSourceV1Response](docs/DeployContractGoSourceV1Response.md)
 - [org.openapitools.client.models.DeployContractV1Request](docs/DeployContractV1Request.md)
 - [org.openapitools.client.models.DeployContractV1Response](docs/DeployContractV1Response.md)
 - [org.openapitools.client.models.DeploymentTargetOrgFabric2x](docs/DeploymentTargetOrgFabric2x.md)
 - [org.openapitools.client.models.DeploymentTargetOrganization](docs/DeploymentTargetOrganization.md)
 - [org.openapitools.client.models.ErrorExceptionResponseV1](docs/ErrorExceptionResponseV1.md)
 - [org.openapitools.client.models.FabricContractInvocationType](docs/FabricContractInvocationType.md)
 - [org.openapitools.client.models.FabricSigningCredential](docs/FabricSigningCredential.md)
 - [org.openapitools.client.models.FabricSigningCredentialType](docs/FabricSigningCredentialType.md)
 - [org.openapitools.client.models.FileBase64](docs/FileBase64.md)
 - [org.openapitools.client.models.GatewayDiscoveryOptions](docs/GatewayDiscoveryOptions.md)
 - [org.openapitools.client.models.GatewayEventHandlerOptions](docs/GatewayEventHandlerOptions.md)
 - [org.openapitools.client.models.GatewayOptions](docs/GatewayOptions.md)
 - [org.openapitools.client.models.GatewayOptionsWallet](docs/GatewayOptionsWallet.md)
 - [org.openapitools.client.models.GetBlockRequestV1](docs/GetBlockRequestV1.md)
 - [org.openapitools.client.models.GetBlockRequestV1Query](docs/GetBlockRequestV1Query.md)
 - [org.openapitools.client.models.GetBlockRequestV1QueryBlockHash](docs/GetBlockRequestV1QueryBlockHash.md)
 - [org.openapitools.client.models.GetBlockResponseDecodedV1](docs/GetBlockResponseDecodedV1.md)
 - [org.openapitools.client.models.GetBlockResponseEncodedV1](docs/GetBlockResponseEncodedV1.md)
 - [org.openapitools.client.models.GetBlockResponseV1](docs/GetBlockResponseV1.md)
 - [org.openapitools.client.models.GetTransactionReceiptResponse](docs/GetTransactionReceiptResponse.md)
 - [org.openapitools.client.models.InlineResponse501](docs/InlineResponse501.md)
 - [org.openapitools.client.models.RunTransactionRequest](docs/RunTransactionRequest.md)
 - [org.openapitools.client.models.RunTransactionResponse](docs/RunTransactionResponse.md)
 - [org.openapitools.client.models.SSHExecCommandResponse](docs/SSHExecCommandResponse.md)
 - [org.openapitools.client.models.TransactReceiptBlockMetaData](docs/TransactReceiptBlockMetaData.md)
 - [org.openapitools.client.models.TransactReceiptTransactionCreator](docs/TransactReceiptTransactionCreator.md)
 - [org.openapitools.client.models.TransactReceiptTransactionEndorsement](docs/TransactReceiptTransactionEndorsement.md)
 - [org.openapitools.client.models.VaultTransitKey](docs/VaultTransitKey.md)
 - [org.openapitools.client.models.WatchBlocksCactusErrorResponseV1](docs/WatchBlocksCactusErrorResponseV1.md)
 - [org.openapitools.client.models.WatchBlocksCactusTransactionsEventV1](docs/WatchBlocksCactusTransactionsEventV1.md)
 - [org.openapitools.client.models.WatchBlocksCactusTransactionsResponseV1](docs/WatchBlocksCactusTransactionsResponseV1.md)
 - [org.openapitools.client.models.WatchBlocksFilteredResponseV1](docs/WatchBlocksFilteredResponseV1.md)
 - [org.openapitools.client.models.WatchBlocksFullResponseV1](docs/WatchBlocksFullResponseV1.md)
 - [org.openapitools.client.models.WatchBlocksListenerTypeV1](docs/WatchBlocksListenerTypeV1.md)
 - [org.openapitools.client.models.WatchBlocksOptionsV1](docs/WatchBlocksOptionsV1.md)
 - [org.openapitools.client.models.WatchBlocksPrivateResponseV1](docs/WatchBlocksPrivateResponseV1.md)
 - [org.openapitools.client.models.WatchBlocksResponseV1](docs/WatchBlocksResponseV1.md)
 - [org.openapitools.client.models.WatchBlocksV1](docs/WatchBlocksV1.md)
 - [org.openapitools.client.models.WebSocketKey](docs/WebSocketKey.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
