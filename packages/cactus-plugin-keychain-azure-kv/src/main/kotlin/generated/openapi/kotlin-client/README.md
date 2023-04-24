# org.openapitools.client - Kotlin client library for Hyperledger Cactus - Keychain API

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
*DefaultApi* | [**deleteKeychainEntryV1**](docs/DefaultApi.md#deletekeychainentryv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-keychain-azure-kv/delete-keychain-entry | Deletes a value under a key on the keychain backend.
*DefaultApi* | [**getKeychainEntryV1**](docs/DefaultApi.md#getkeychainentryv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-keychain-azure-kv/get-keychain-entry | Retrieves the contents of a keychain entry from the backend.
*DefaultApi* | [**hasKeychainEntryV1**](docs/DefaultApi.md#haskeychainentryv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-keychain-azure-kv/has-keychain-entry | Checks that an entry exists under a key on the keychain backend
*DefaultApi* | [**setKeychainEntryV1**](docs/DefaultApi.md#setkeychainentryv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-keychain-azure-kv/set-keychain-entry | Sets a value under a key on the keychain backend.


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.DeleteKeychainEntryRequestV1](docs/DeleteKeychainEntryRequestV1.md)
 - [org.openapitools.client.models.DeleteKeychainEntryResponseV1](docs/DeleteKeychainEntryResponseV1.md)
 - [org.openapitools.client.models.GetKeychainEntryRequest](docs/GetKeychainEntryRequest.md)
 - [org.openapitools.client.models.GetKeychainEntryResponse](docs/GetKeychainEntryResponse.md)
 - [org.openapitools.client.models.HasKeychainEntryRequestV1](docs/HasKeychainEntryRequestV1.md)
 - [org.openapitools.client.models.HasKeychainEntryResponseV1](docs/HasKeychainEntryResponseV1.md)
 - [org.openapitools.client.models.SetKeychainEntryRequest](docs/SetKeychainEntryRequest.md)
 - [org.openapitools.client.models.SetKeychainEntryResponse](docs/SetKeychainEntryResponse.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
