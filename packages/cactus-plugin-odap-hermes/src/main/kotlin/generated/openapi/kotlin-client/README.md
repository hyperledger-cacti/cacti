# org.openapitools.client - Kotlin client library for Hyperledger Cactus Plugin - Odap Hermes

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
*DefaultApi* | [**clientRequestV1**](docs/DefaultApi.md#clientrequestv1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/clientrequest | 
*DefaultApi* | [**phase1TransferInitiationRequestV1**](docs/DefaultApi.md#phase1transferinitiationrequestv1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase1/transferinitiationrequest | 
*DefaultApi* | [**phase1TransferInitiationResponseV1**](docs/DefaultApi.md#phase1transferinitiationresponsev1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase1/transferinitiationresponse | 
*DefaultApi* | [**phase2LockEvidenceRequestV1**](docs/DefaultApi.md#phase2lockevidencerequestv1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase2/lockevidencerequest | 
*DefaultApi* | [**phase2LockEvidenceResponseV1**](docs/DefaultApi.md#phase2lockevidenceresponsev1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase2/lockevidenceresponse | 
*DefaultApi* | [**phase2TransferCommenceRequestV1**](docs/DefaultApi.md#phase2transfercommencerequestv1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase2/transfercommencerequest | 
*DefaultApi* | [**phase2TransferCommenceResponseV1**](docs/DefaultApi.md#phase2transfercommenceresponsev1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase2/transfercommenceresponse | 
*DefaultApi* | [**phase3CommitFinalRequestV1**](docs/DefaultApi.md#phase3commitfinalrequestv1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase3/commitfinalrequest | 
*DefaultApi* | [**phase3CommitFinalResponseV1**](docs/DefaultApi.md#phase3commitfinalresponsev1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase3/commitfinalresponse | 
*DefaultApi* | [**phase3CommitPreparationRequestV1**](docs/DefaultApi.md#phase3commitpreparationrequestv1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase3/commitpreparationrequest | 
*DefaultApi* | [**phase3CommitPreparationResponseV1**](docs/DefaultApi.md#phase3commitpreparationresponsev1) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase3/commitpreparationresponse | 
*DefaultApi* | [**phase3TransferCompleteRequestV1**](docs/DefaultApi.md#phase3transfercompleterequestv1) | **GET** /api/v1/@hyperledger/cactus-plugin-odap-hermes/phase3/transfercompleterequest | 
*DefaultApi* | [**recoverUpdateAckV1Message**](docs/DefaultApi.md#recoverupdateackv1message) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/recoverupdateackmessage | 
*DefaultApi* | [**recoverUpdateV1Message**](docs/DefaultApi.md#recoverupdatev1message) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/recoverupdatemessage | 
*DefaultApi* | [**recoverV1Message**](docs/DefaultApi.md#recoverv1message) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/recovermessage | 
*DefaultApi* | [**recoverV1Success**](docs/DefaultApi.md#recoverv1success) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/recoversuccessmessage | 
*DefaultApi* | [**rollbackAckV1Message**](docs/DefaultApi.md#rollbackackv1message) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/rollbackackmessage | 
*DefaultApi* | [**rollbackV1Message**](docs/DefaultApi.md#rollbackv1message) | **POST** /api/v1/@hyperledger/cactus-plugin-odap-hermes/rollbackmessage | 


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.AssetProfile](docs/AssetProfile.md)
 - [org.openapitools.client.models.ClientV1Request](docs/ClientV1Request.md)
 - [org.openapitools.client.models.ClientV1RequestClientGatewayConfiguration](docs/ClientV1RequestClientGatewayConfiguration.md)
 - [org.openapitools.client.models.CommitFinalV1Request](docs/CommitFinalV1Request.md)
 - [org.openapitools.client.models.CommitFinalV1Response](docs/CommitFinalV1Response.md)
 - [org.openapitools.client.models.CommitPreparationV1Request](docs/CommitPreparationV1Request.md)
 - [org.openapitools.client.models.CommitPreparationV1Response](docs/CommitPreparationV1Response.md)
 - [org.openapitools.client.models.CredentialProfile](docs/CredentialProfile.md)
 - [org.openapitools.client.models.History](docs/History.md)
 - [org.openapitools.client.models.LockEvidenceV1Request](docs/LockEvidenceV1Request.md)
 - [org.openapitools.client.models.LockEvidenceV1Response](docs/LockEvidenceV1Response.md)
 - [org.openapitools.client.models.OdapLocalLog](docs/OdapLocalLog.md)
 - [org.openapitools.client.models.OdapMessage](docs/OdapMessage.md)
 - [org.openapitools.client.models.OdapMessageActionResponse](docs/OdapMessageActionResponse.md)
 - [org.openapitools.client.models.PayloadProfile](docs/PayloadProfile.md)
 - [org.openapitools.client.models.RecoverSuccessV1Message](docs/RecoverSuccessV1Message.md)
 - [org.openapitools.client.models.RecoverUpdateAckV1Message](docs/RecoverUpdateAckV1Message.md)
 - [org.openapitools.client.models.RecoverUpdateV1Message](docs/RecoverUpdateV1Message.md)
 - [org.openapitools.client.models.RecoverV1Message](docs/RecoverV1Message.md)
 - [org.openapitools.client.models.RollbackAckV1Message](docs/RollbackAckV1Message.md)
 - [org.openapitools.client.models.RollbackV1Message](docs/RollbackV1Message.md)
 - [org.openapitools.client.models.SessionData](docs/SessionData.md)
 - [org.openapitools.client.models.TransferCommenceV1Request](docs/TransferCommenceV1Request.md)
 - [org.openapitools.client.models.TransferCommenceV1Response](docs/TransferCommenceV1Response.md)
 - [org.openapitools.client.models.TransferCompleteV1Request](docs/TransferCompleteV1Request.md)
 - [org.openapitools.client.models.TransferInitializationV1Request](docs/TransferInitializationV1Request.md)
 - [org.openapitools.client.models.TransferInitializationV1Response](docs/TransferInitializationV1Response.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
