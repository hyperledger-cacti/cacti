# org.openapitools.client - Kotlin client library for Hyperledger Cactus Plugin - HTLC ETH BESU ERC20

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
*DefaultApi* | [**getSingleStatusV1**](docs/DefaultApi.md#getsinglestatusv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/get-single-status | 
*DefaultApi* | [**getStatusV1**](docs/DefaultApi.md#getstatusv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/get-status | 
*DefaultApi* | [**initializeV1**](docs/DefaultApi.md#initializev1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/initialize | Initialize contract
*DefaultApi* | [**newContractV1**](docs/DefaultApi.md#newcontractv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/new-contract | Create a new hashtimelock contract
*DefaultApi* | [**refundV1**](docs/DefaultApi.md#refundv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/refund | Refund a hashtimelock contract
*DefaultApi* | [**withdrawV1**](docs/DefaultApi.md#withdrawv1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/withdraw | Withdraw a hashtimelock contract


<a name="documentation-for-models"></a>
## Documentation for Models

 - [org.openapitools.client.models.GetSingleStatusRequest](docs/GetSingleStatusRequest.md)
 - [org.openapitools.client.models.GetStatusRequest](docs/GetStatusRequest.md)
 - [org.openapitools.client.models.InitializeRequest](docs/InitializeRequest.md)
 - [org.openapitools.client.models.InvokeContractV1Response](docs/InvokeContractV1Response.md)
 - [org.openapitools.client.models.NewContractRequest](docs/NewContractRequest.md)
 - [org.openapitools.client.models.RefundRequest](docs/RefundRequest.md)
 - [org.openapitools.client.models.RunTransactionResponse](docs/RunTransactionResponse.md)
 - [org.openapitools.client.models.Web3SigningCredential](docs/Web3SigningCredential.md)
 - [org.openapitools.client.models.Web3SigningCredentialCactusKeychainRef](docs/Web3SigningCredentialCactusKeychainRef.md)
 - [org.openapitools.client.models.Web3SigningCredentialNone](docs/Web3SigningCredentialNone.md)
 - [org.openapitools.client.models.Web3SigningCredentialPrivateKeyHex](docs/Web3SigningCredentialPrivateKeyHex.md)
 - [org.openapitools.client.models.Web3SigningCredentialType](docs/Web3SigningCredentialType.md)
 - [org.openapitools.client.models.Web3TransactionReceipt](docs/Web3TransactionReceipt.md)
 - [org.openapitools.client.models.WithdrawRequest](docs/WithdrawRequest.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
