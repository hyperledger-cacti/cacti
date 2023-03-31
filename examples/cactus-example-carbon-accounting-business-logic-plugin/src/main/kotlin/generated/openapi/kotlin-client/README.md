# org.openapitools.client - Kotlin client library for Hyperledger Cactus Example - Carbon Accounting App

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
*DefaultApi* | [**daoTokenGetAllowanceV1**](docs/DefaultApi.md#daotokengetallowancev1) | **POST** /api/v1/plugins/@hyperledger/cactus-example-carbon-accounting-backend/dao-token/get-allowance | Get the number of tokens `spender` is approved to spend on behalf of `account`
*DefaultApi* | [**enrollAdminV1**](docs/DefaultApi.md#enrolladminv1) | **POST** /api/v1/utilityemissionchannel/registerEnroll/admin | Registers an admin account within the Fabric organization specified.


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.AuthzJwtClaim](docs/AuthzJwtClaim.md)
 - [org.openapitools.client.models.AuthzScope](docs/AuthzScope.md)
 - [org.openapitools.client.models.Checkpoint](docs/Checkpoint.md)
 - [org.openapitools.client.models.DaoTokenGetAllowanceNotFoundResponse](docs/DaoTokenGetAllowanceNotFoundResponse.md)
 - [org.openapitools.client.models.DaoTokenGetAllowanceRequest](docs/DaoTokenGetAllowanceRequest.md)
 - [org.openapitools.client.models.DaoTokenGetAllowanceResponse](docs/DaoTokenGetAllowanceResponse.md)
 - [org.openapitools.client.models.EnrollAdminInfo](docs/EnrollAdminInfo.md)
 - [org.openapitools.client.models.EnrollAdminV1Request](docs/EnrollAdminV1Request.md)
 - [org.openapitools.client.models.EnrollAdminV1Response](docs/EnrollAdminV1Response.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
