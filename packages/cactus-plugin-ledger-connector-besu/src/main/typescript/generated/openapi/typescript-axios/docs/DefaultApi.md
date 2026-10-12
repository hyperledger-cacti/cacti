# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**deployContractSolBytecodeNoKeychainV1**](#deploycontractsolbytecodenokeychainv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/deploy-contract-solidity-bytecode-no-keychain | Deploys the bytecode of a Solidity contract without the need of keychain|
|[**deployContractSolBytecodeV1**](#deploycontractsolbytecodev1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/deploy-contract-solidity-bytecode | Deploys the bytecode of a Solidity contract.|
|[**getBalanceV1**](#getbalancev1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/get-balance | Return balance of an address of a given block|
|[**getBesuRecordV1**](#getbesurecordv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/get-besu-record | Retrieves an arbitrary record (any piece of information) from the ledger. Ledger records can be call outputs, transaction input, etc.|
|[**getBlockV1**](#getblockv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/get-block | Returns a block matching the block|
|[**getOpenApiSpecV1**](#getopenapispecv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/get-open-api-spec | Retrieves the .json file that contains the OpenAPI specification for the plugin.|
|[**getPastLogsV1**](#getpastlogsv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/get-past-logs | Gets past logs, matching the given options.|
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics | Get the Prometheus Metrics|
|[**getTransactionV1**](#gettransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/get-transaction | Executes a transaction on a besu ledger|
|[**invokeContractV1**](#invokecontractv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/invoke-contract | Invokes a contract on a besu ledger|
|[**runTransactionV1**](#runtransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/run-transaction | Executes a transaction on a besu ledger|
|[**signTransactionV1**](#signtransactionv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-besu/sign-transaction | Obtain signatures of ledger from the corresponding transaction hash.|

# **deployContractSolBytecodeNoKeychainV1**
> DeployContractSolidityBytecodeV1Response deployContractSolBytecodeNoKeychainV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    DeployContractSolidityBytecodeNoKeychainV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let deployContractSolidityBytecodeNoKeychainV1Request: DeployContractSolidityBytecodeNoKeychainV1Request; // (optional)

const { status, data } = await apiInstance.deployContractSolBytecodeNoKeychainV1(
    deployContractSolidityBytecodeNoKeychainV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deployContractSolidityBytecodeNoKeychainV1Request** | **DeployContractSolidityBytecodeNoKeychainV1Request**|  | |


### Return type

**DeployContractSolidityBytecodeV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deployContractSolBytecodeV1**
> DeployContractSolidityBytecodeV1Response deployContractSolBytecodeV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    DeployContractSolidityBytecodeV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let deployContractSolidityBytecodeV1Request: DeployContractSolidityBytecodeV1Request; // (optional)

const { status, data } = await apiInstance.deployContractSolBytecodeV1(
    deployContractSolidityBytecodeV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deployContractSolidityBytecodeV1Request** | **DeployContractSolidityBytecodeV1Request**|  | |


### Return type

**DeployContractSolidityBytecodeV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBalanceV1**
> GetBalanceV1Response getBalanceV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetBalanceV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getBalanceV1Request: GetBalanceV1Request; // (optional)

const { status, data } = await apiInstance.getBalanceV1(
    getBalanceV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getBalanceV1Request** | **GetBalanceV1Request**|  | |


### Return type

**GetBalanceV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBesuRecordV1**
> GetBesuRecordV1Response getBesuRecordV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetBesuRecordV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getBesuRecordV1Request: GetBesuRecordV1Request; // (optional)

const { status, data } = await apiInstance.getBesuRecordV1(
    getBesuRecordV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getBesuRecordV1Request** | **GetBesuRecordV1Request**|  | |


### Return type

**GetBesuRecordV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: text/plain, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBlockV1**
> GetBlockV1Response getBlockV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetBlockV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getBlockV1Request: GetBlockV1Request; // (optional)

const { status, data } = await apiInstance.getBlockV1(
    getBlockV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getBlockV1Request** | **GetBlockV1Request**|  | |


### Return type

**GetBlockV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

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
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPastLogsV1**
> GetPastLogsV1Response getPastLogsV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetPastLogsV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getPastLogsV1Request: GetPastLogsV1Request; // (optional)

const { status, data } = await apiInstance.getPastLogsV1(
    getPastLogsV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getPastLogsV1Request** | **GetPastLogsV1Request**|  | |


### Return type

**GetPastLogsV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

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
 - **Accept**: text/plain, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getTransactionV1**
> GetTransactionV1Response getTransactionV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetTransactionV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getTransactionV1Request: GetTransactionV1Request; // (optional)

const { status, data } = await apiInstance.getTransactionV1(
    getTransactionV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getTransactionV1Request** | **GetTransactionV1Request**|  | |


### Return type

**GetTransactionV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

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
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

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
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **signTransactionV1**
> SignTransactionResponse signTransactionV1(signTransactionRequest)

Obtain signatures of ledger from the corresponding transaction hash.

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    SignTransactionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let signTransactionRequest: SignTransactionRequest; //

const { status, data } = await apiInstance.signTransactionV1(
    signTransactionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **signTransactionRequest** | **SignTransactionRequest**|  | |


### Return type

**SignTransactionResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Not able to find the corresponding tranaction from the transaction hash |  -  |
|**503** | API is unable to reach the validator |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

