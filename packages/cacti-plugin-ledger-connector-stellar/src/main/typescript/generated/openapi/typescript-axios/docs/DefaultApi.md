# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**deployContractV1**](#deploycontractv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-stellar/deploy-contract | Deploys a smart contract to the Stellar ledger associated with the connector.|
|[**getOpenApiSpecV1**](#getopenapispecv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-stellar/get-open-api-spec | Retrieves the .json file that contains the OpenAPI specification for the plugin.|
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-stellar/get-prometheus-exporter-metrics | Get the Prometheus Metrics|
|[**runSorobanTransactionV1**](#runsorobantransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-stellar/run-soroban-transaction | Executes a Soroban transaction on a stellar ledger|

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
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getOpenApiSpecV1**
> string getOpenApiSpecV1()


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

**string**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

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

# **runSorobanTransactionV1**
> RunSorobanTransactionResponse runSorobanTransactionV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    RunSorobanTransactionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let runSorobanTransactionRequest: RunSorobanTransactionRequest; // (optional)

const { status, data } = await apiInstance.runSorobanTransactionV1(
    runSorobanTransactionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **runSorobanTransactionRequest** | **RunSorobanTransactionRequest**|  | |


### Return type

**RunSorobanTransactionResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

