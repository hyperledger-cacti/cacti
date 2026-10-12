# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**deployContract**](#deploycontract) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/deploy-contract | Deploys the contract to ethereum ledger.|
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/get-prometheus-exporter-metrics | Get the Prometheus Metrics|
|[**invokeContractV1**](#invokecontractv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/invoke-contract | Invokes a contract on an ethereum ledger|
|[**invokeRawWeb3EthContractV1**](#invokerawweb3ethcontractv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/invoke-raw-web3eth-contract | Low-level endpoint to invoke a method on deployed contract.|
|[**invokeWeb3EthMethodV1**](#invokeweb3ethmethodv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/invoke-raw-web3eth-method | Invoke any method from web3.eth (low-level)|
|[**runTransactionV1**](#runtransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/run-transaction | Executes a transaction on a ethereum ledger|

# **deployContract**
> RunTransactionResponse deployContract()


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

const { status, data } = await apiInstance.deployContract(
    deployContractV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deployContractV1Request** | **DeployContractV1Request**|  | |


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

# **invokeContractV1**
> InvokeContractV1Response invokeContractV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    InvokeContractV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let invokeContractV1Request: InvokeContractV1Request; // (optional)

const { status, data } = await apiInstance.invokeContractV1(
    invokeContractV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **invokeContractV1Request** | **InvokeContractV1Request**|  | |


### Return type

**InvokeContractV1Response**

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

# **invokeRawWeb3EthContractV1**
> InvokeRawWeb3EthContractV1Response invokeRawWeb3EthContractV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    InvokeRawWeb3EthContractV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let invokeRawWeb3EthContractV1Request: InvokeRawWeb3EthContractV1Request; // (optional)

const { status, data } = await apiInstance.invokeRawWeb3EthContractV1(
    invokeRawWeb3EthContractV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **invokeRawWeb3EthContractV1Request** | **InvokeRawWeb3EthContractV1Request**|  | |


### Return type

**InvokeRawWeb3EthContractV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: text/plain, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **invokeWeb3EthMethodV1**
> InvokeRawWeb3EthMethodV1Response invokeWeb3EthMethodV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    InvokeRawWeb3EthMethodV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let invokeRawWeb3EthMethodV1Request: InvokeRawWeb3EthMethodV1Request; // (optional)

const { status, data } = await apiInstance.invokeWeb3EthMethodV1(
    invokeRawWeb3EthMethodV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **invokeRawWeb3EthMethodV1Request** | **InvokeRawWeb3EthMethodV1Request**|  | |


### Return type

**InvokeRawWeb3EthMethodV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: text/plain, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **runTransactionV1**
> RunTransactionResponse runTransactionV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    RunTransactionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let runTransactionRequest: RunTransactionRequest; // (optional)

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

