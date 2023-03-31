# org.openapitools.client - Kotlin client library for Hyperledger Cactus Plugin - Consortium Web Service

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
*DefaultApi* | [**getConsortiumJwsV1**](docs/DefaultApi.md#getconsortiumjwsv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/consortium/jws | Retrieves a consortium JWS
*DefaultApi* | [**getNodeJwsV1**](docs/DefaultApi.md#getnodejwsv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/node/jws | Retrieves the JWT of a Cactus Node
*DefaultApi* | [**getPrometheusMetricsV1**](docs/DefaultApi.md#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/get-prometheus-exporter-metrics | Get the Prometheus Metrics


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.GetConsortiumJwsResponse](docs/GetConsortiumJwsResponse.md)
 - [org.openapitools.client.models.GetNodeJwsResponse](docs/GetNodeJwsResponse.md)
 - [org.openapitools.client.models.JWSGeneral](docs/JWSGeneral.md)
 - [org.openapitools.client.models.JWSRecipient](docs/JWSRecipient.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
