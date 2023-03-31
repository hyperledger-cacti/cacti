# org.openapitools.client - Kotlin client library for Hyperledger Core API

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


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.CactusNode](docs/CactusNode.md)
 - [org.openapitools.client.models.CactusNodeAllOf](docs/CactusNodeAllOf.md)
 - [org.openapitools.client.models.CactusNodeMeta](docs/CactusNodeMeta.md)
 - [org.openapitools.client.models.ConsensusAlgorithmFamiliesWithOutTxFinality](docs/ConsensusAlgorithmFamiliesWithOutTxFinality.md)
 - [org.openapitools.client.models.ConsensusAlgorithmFamiliesWithTxFinality](docs/ConsensusAlgorithmFamiliesWithTxFinality.md)
 - [org.openapitools.client.models.ConsensusAlgorithmFamily](docs/ConsensusAlgorithmFamily.md)
 - [org.openapitools.client.models.Consortium](docs/Consortium.md)
 - [org.openapitools.client.models.ConsortiumDatabase](docs/ConsortiumDatabase.md)
 - [org.openapitools.client.models.ConsortiumMember](docs/ConsortiumMember.md)
 - [org.openapitools.client.models.Constants](docs/Constants.md)
 - [org.openapitools.client.models.DeleteKeychainEntryRequestV1](docs/DeleteKeychainEntryRequestV1.md)
 - [org.openapitools.client.models.DeleteKeychainEntryResponseV1](docs/DeleteKeychainEntryResponseV1.md)
 - [org.openapitools.client.models.GetKeychainEntryRequestV1](docs/GetKeychainEntryRequestV1.md)
 - [org.openapitools.client.models.GetKeychainEntryResponseV1](docs/GetKeychainEntryResponseV1.md)
 - [org.openapitools.client.models.GetObjectRequestV1](docs/GetObjectRequestV1.md)
 - [org.openapitools.client.models.GetObjectResponseV1](docs/GetObjectResponseV1.md)
 - [org.openapitools.client.models.HasKeychainEntryRequestV1](docs/HasKeychainEntryRequestV1.md)
 - [org.openapitools.client.models.HasKeychainEntryResponseV1](docs/HasKeychainEntryResponseV1.md)
 - [org.openapitools.client.models.HasObjectRequestV1](docs/HasObjectRequestV1.md)
 - [org.openapitools.client.models.HasObjectResponseV1](docs/HasObjectResponseV1.md)
 - [org.openapitools.client.models.JWSGeneral](docs/JWSGeneral.md)
 - [org.openapitools.client.models.JWSRecipient](docs/JWSRecipient.md)
 - [org.openapitools.client.models.Ledger](docs/Ledger.md)
 - [org.openapitools.client.models.LedgerType](docs/LedgerType.md)
 - [org.openapitools.client.models.PluginImport](docs/PluginImport.md)
 - [org.openapitools.client.models.PluginImportAction](docs/PluginImportAction.md)
 - [org.openapitools.client.models.PluginImportType](docs/PluginImportType.md)
 - [org.openapitools.client.models.PluginInstance](docs/PluginInstance.md)
 - [org.openapitools.client.models.SetKeychainEntryRequestV1](docs/SetKeychainEntryRequestV1.md)
 - [org.openapitools.client.models.SetKeychainEntryResponseV1](docs/SetKeychainEntryResponseV1.md)
 - [org.openapitools.client.models.SetObjectRequestV1](docs/SetObjectRequestV1.md)
 - [org.openapitools.client.models.SetObjectResponseV1](docs/SetObjectResponseV1.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
