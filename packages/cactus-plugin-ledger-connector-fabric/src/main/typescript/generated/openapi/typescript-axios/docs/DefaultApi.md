# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**deployContractV1**](#deploycontractv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/deploy-contract | Deploys a chaincode contract from a set of source files. Note: This endpoint only supports Fabric 2.x. The \&#39;v1\&#39; suffix in the method name refers to the Cactus API version, not the supported Fabric ledger version.|
|[**getBlockV1**](#getblockv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/get-block | Get block from the channel using one of selectors from the input. Works only on Fabric 2.x.|
|[**getChainInfoV1**](#getchaininfov1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/get-chain-info | Get fabric ledger chain info.|
|[**getDiscoveryResultsV1**](#getdiscoveryresultsv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/get-discovery-results | Get fabric ledger node structure (from the discovery service).|
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/get-prometheus-exporter-metrics | Get the Prometheus Metrics|
|[**getTransactionReceiptByTxIDV1**](#gettransactionreceiptbytxidv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/get-transaction-receipt-by-txid | get a transaction receipt by tx id on a Fabric ledger.|
|[**runDelegatedSignTransactionV1**](#rundelegatedsigntransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/run-delegated-sign-transaction | Runs a transaction on a Fabric ledger using user-provided signing callback.|
|[**runTransactionV1**](#runtransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-fabric/run-transaction | Runs a transaction on a Fabric ledger.|

# **deployContractV1**
> DeployContractV1Response deployContractV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    DeployContractV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let deployContractV1Request: DeployContractV1Request; // (optional)

const { status, data } = await apiInstance.deployContractV1(
    deployContractV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deployContractV1Request** | **DeployContractV1Request**|  | |


### Return type

**DeployContractV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**501** | Not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBlockV1**
> GetBlockResponseV1 getBlockV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetBlockRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getBlockRequestV1: GetBlockRequestV1; // (optional)

const { status, data } = await apiInstance.getBlockV1(
    getBlockRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getBlockRequestV1** | **GetBlockRequestV1**|  | |


### Return type

**GetBlockResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getChainInfoV1**
> GetChainInfoResponseV1 getChainInfoV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetChainInfoRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getChainInfoRequestV1: GetChainInfoRequestV1; // (optional)

const { status, data } = await apiInstance.getChainInfoV1(
    getChainInfoRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getChainInfoRequestV1** | **GetChainInfoRequestV1**|  | |


### Return type

**GetChainInfoResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDiscoveryResultsV1**
> GetDiscoveryResultsResponseV1 getDiscoveryResultsV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetDiscoveryResultsRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getDiscoveryResultsRequestV1: GetDiscoveryResultsRequestV1; // (optional)

const { status, data } = await apiInstance.getDiscoveryResultsV1(
    getDiscoveryResultsRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getDiscoveryResultsRequestV1** | **GetDiscoveryResultsRequestV1**|  | |


### Return type

**GetDiscoveryResultsResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPrometheusMetricsV1**
> string getPrometheusMetricsV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.getPrometheusMetricsV1();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getTransactionReceiptByTxIDV1**
> GetTransactionReceiptResponse getTransactionReceiptByTxIDV1(runTransactionRequest)



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

const { status, data } = await apiInstance.getTransactionReceiptByTxIDV1(
    runTransactionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **runTransactionRequest** | **RunTransactionRequest**|  | |


### Return type

**GetTransactionReceiptResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **runDelegatedSignTransactionV1**
> RunTransactionResponse runDelegatedSignTransactionV1(runDelegatedSignTransactionRequest)



### Example

```typescript
import {
    DefaultApi,
    Configuration,
    RunDelegatedSignTransactionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let runDelegatedSignTransactionRequest: RunDelegatedSignTransactionRequest; //

const { status, data } = await apiInstance.runDelegatedSignTransactionV1(
    runDelegatedSignTransactionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **runDelegatedSignTransactionRequest** | **RunDelegatedSignTransactionRequest**|  | |


### Return type

**RunTransactionResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

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

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

