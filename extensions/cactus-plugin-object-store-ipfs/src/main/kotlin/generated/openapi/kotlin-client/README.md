# org.openapitools.client - Kotlin client library for Hyperledger Cactus Plugin - Object Store - IPFS 

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

All URIs are relative to *https://www.cactus.stream*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*DefaultApi* | [**getObjectV1**](docs/DefaultApi.md#getobjectv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/get-object | Retrieves an object from the object store.
*DefaultApi* | [**hasObjectV1**](docs/DefaultApi.md#hasobjectv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/has-object | Checks the presence of an object in the object store.
*DefaultApi* | [**setObjectV1**](docs/DefaultApi.md#setobjectv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/set-object | Sets an object in the object store under the specified key.


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.GetObjectRequestV1](docs/GetObjectRequestV1.md)
 - [org.openapitools.client.models.GetObjectResponseV1](docs/GetObjectResponseV1.md)
 - [org.openapitools.client.models.HasObjectRequestV1](docs/HasObjectRequestV1.md)
 - [org.openapitools.client.models.HasObjectResponseV1](docs/HasObjectResponseV1.md)
 - [org.openapitools.client.models.SetObjectRequestV1](docs/SetObjectRequestV1.md)
 - [org.openapitools.client.models.SetObjectResponseV1](docs/SetObjectResponseV1.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
