# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getActiveContractsV1**](#getactivecontractsv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/get-active-contracts | Returns active Canton contracts visible to the requested parties.|
|[**getOpenApiSpecV1**](#getopenapispecv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/get-open-api-spec | Returns the connector OpenAPI specification.|
|[**listPartiesV1**](#listpartiesv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/list-parties | Lists Canton parties available to the authenticated user.|
|[**runTransactionV1**](#runtransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/run-transaction | Submits Daml commands for a Canton-hosted party.|

# **getActiveContractsV1**
> GetActiveContractsResponse getActiveContractsV1(getActiveContractsRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetActiveContractsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getActiveContractsRequest: GetActiveContractsRequest; //

const { status, data } = await apiInstance.getActiveContractsV1(
    getActiveContractsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getActiveContractsRequest** | **GetActiveContractsRequest**|  | |


### Return type

**GetActiveContractsResponse**

### Authorization

[bearerTokenAuth](../README.md#bearerTokenAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Matching active contracts. |  -  |
|**400** | Invalid contract query, or an out-of-range offset. |  -  |
|**401** | The request has no valid bearer token. |  -  |
|**403** | The caller, the connector, or the ledger does not allow the requested party. |  -  |
|**404** | A Canton resource referenced by the contract query was not found. |  -  |
|**409** | The contract query conflicts with the current Canton ledger state. |  -  |
|**413** | More contracts match than the participant returns in one response. |  -  |
|**502** | Canton contract query failed upstream. |  -  |
|**503** | The connector is shut down or busy, or the ledger is temporarily unavailable. |  -  |
|**504** | The Canton contract query timed out. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getOpenApiSpecV1**
> { [key: string]: any; } getOpenApiSpecV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.getOpenApiSpecV1();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**{ [key: string]: any; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | The connector OpenAPI specification. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listPartiesV1**
> ListPartiesResponse listPartiesV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.listPartiesV1();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ListPartiesResponse**

### Authorization

[bearerTokenAuth](../README.md#bearerTokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Available Canton parties. |  -  |
|**400** | The Canton ledger rejected the party query as invalid. |  -  |
|**401** | The request has no valid bearer token. |  -  |
|**403** | The caller is not authorized to list parties. |  -  |
|**404** | A Canton resource required for the party query was not found. |  -  |
|**409** | The party query conflicts with the current Canton ledger state. |  -  |
|**502** | Canton party lookup failed upstream. |  -  |
|**503** | The connector is shut down or busy, or the ledger is temporarily unavailable. |  -  |
|**504** | The Canton party query timed out. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **runTransactionV1**
> RunTransactionResponse runTransactionV1(runTransactionRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    RunTransactionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let runTransactionRequest: RunTransactionRequest; //

const { status, data } = await apiInstance.runTransactionV1(
    runTransactionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **runTransactionRequest** | **RunTransactionRequest**|  | |


### Return type

**RunTransactionResponse**

### Authorization

[bearerTokenAuth](../README.md#bearerTokenAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | The commands were committed. |  -  |
|**400** | Invalid transaction request, or the ledger rejected it as invalid. |  -  |
|**401** | The request has no valid bearer token. |  -  |
|**403** | The caller, the connector, or the ledger does not allow the requested party. |  -  |
|**404** | A contract or other resource referenced by a command was not found. |  -  |
|**409** | The ledger already has a command with this commandId, or the commands conflict with the ledger state. |  -  |
|**413** | The transaction payload exceeds the connector limit. |  -  |
|**502** | Canton transaction submission failed upstream. |  -  |
|**503** | The connector is shut down or busy, or the ledger is temporarily unavailable. Retry with the same commandId. |  -  |
|**504** | The Canton transaction operation timed out; the outcome is unknown. Retry with the same commandId. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

