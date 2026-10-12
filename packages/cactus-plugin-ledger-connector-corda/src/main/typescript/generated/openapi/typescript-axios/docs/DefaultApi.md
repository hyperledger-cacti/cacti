# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**clearMonitorTransactionsV1**](#clearmonitortransactionsv1) | **DELETE** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/clear-monitor-transactions | Clear transactions from internal store so they\&#39;ll not be available by GetMonitorTransactionsV1 anymore.|
|[**deployContractJarsV1**](#deploycontractjarsv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/deploy-contract-jars | Deploys a set of jar files (Cordapps, e.g. the contracts in Corda speak).|
|[**diagnoseNodeV1**](#diagnosenodev1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/diagnose-node | |
|[**getFlowV1**](#getflowv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/get-flow-cid | This method gets the current status of the specified flow instance.|
|[**getMonitorTransactionsV1**](#getmonitortransactionsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/get-monitor-transactions | Get transactions for monitored state classes.|
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics | Get the Prometheus Metrics|
|[**invokeContractV1**](#invokecontractv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/invoke-contract | Invokes a contract on a Corda ledger (e.g. a flow)|
|[**listCpiV1**](#listcpiv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/list-cpi | List all CPIs uploaded to the cluster|
|[**listFlowV1**](#listflowv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/list-flow | This method returns an array containing the statuses of all flows running for a specified holding identity. An empty array is returned if there are no flows running.|
|[**listFlowsV1**](#listflowsv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/list-flows | |
|[**networkMapV1**](#networkmapv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/network-map | |
|[**startFlowV1**](#startflowv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/start-flow | This method starts a new instance for the specified flow for the specified holding identity.|
|[**startMonitorV1**](#startmonitorv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/start-monitor | Start monitoring corda changes (transactions) of given state class|
|[**stopMonitorV1**](#stopmonitorv1) | **DELETE** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/stop-monitor | Stop monitoring corda changes (transactions) of given state class|
|[**vaultQueryV1**](#vaultqueryv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/vault-query | |

# **clearMonitorTransactionsV1**
> ClearMonitorTransactionsV1Response clearMonitorTransactionsV1(clearMonitorTransactionsV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ClearMonitorTransactionsV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let clearMonitorTransactionsV1Request: ClearMonitorTransactionsV1Request; //

const { status, data } = await apiInstance.clearMonitorTransactionsV1(
    clearMonitorTransactionsV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **clearMonitorTransactionsV1Request** | **ClearMonitorTransactionsV1Request**|  | |


### Return type

**ClearMonitorTransactionsV1Response**

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

# **deployContractJarsV1**
> DeployContractJarsSuccessV1Response deployContractJarsV1(deployContractJarsV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    DeployContractJarsV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let deployContractJarsV1Request: DeployContractJarsV1Request; //

const { status, data } = await apiInstance.deployContractJarsV1(
    deployContractJarsV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deployContractJarsV1Request** | **DeployContractJarsV1Request**|  | |


### Return type

**DeployContractJarsSuccessV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **diagnoseNodeV1**
> DiagnoseNodeV1Response diagnoseNodeV1()

Responds with diagnostic information about the Corda node

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    DiagnoseNodeV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let diagnoseNodeV1Request: DiagnoseNodeV1Request; // (optional)

const { status, data } = await apiInstance.diagnoseNodeV1(
    diagnoseNodeV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **diagnoseNodeV1Request** | **DiagnoseNodeV1Request**|  | |


### Return type

**DiagnoseNodeV1Response**

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

# **getFlowV1**
> GetFlowCidV1Response getFlowV1(getFlowCidV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetFlowCidV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getFlowCidV1Request: GetFlowCidV1Request; //This method gets the current status of the specified flow instance.

const { status, data } = await apiInstance.getFlowV1(
    getFlowCidV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getFlowCidV1Request** | **GetFlowCidV1Request**| This method gets the current status of the specified flow instance. | |


### Return type

**GetFlowCidV1Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getMonitorTransactionsV1**
> GetMonitorTransactionsV1Response getMonitorTransactionsV1(getMonitorTransactionsV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetMonitorTransactionsV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getMonitorTransactionsV1Request: GetMonitorTransactionsV1Request; //

const { status, data } = await apiInstance.getMonitorTransactionsV1(
    getMonitorTransactionsV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getMonitorTransactionsV1Request** | **GetMonitorTransactionsV1Request**|  | |


### Return type

**GetMonitorTransactionsV1Response**

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
> InvokeContractV1Response invokeContractV1(invokeContractV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    InvokeContractV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let invokeContractV1Request: InvokeContractV1Request; //

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listCpiV1**
> ListCpiV1Response listCpiV1(listCpiV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ListCpiV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let listCpiV1Request: ListCpiV1Request; //

const { status, data } = await apiInstance.listCpiV1(
    listCpiV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listCpiV1Request** | **ListCpiV1Request**|  | |


### Return type

**ListCpiV1Response**

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

# **listFlowV1**
> FlowStatusV1Responses listFlowV1(getFlowCidV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetFlowCidV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getFlowCidV1Request: GetFlowCidV1Request; //This method gets the current status of the specified flow instance.

const { status, data } = await apiInstance.listFlowV1(
    getFlowCidV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getFlowCidV1Request** | **GetFlowCidV1Request**| This method gets the current status of the specified flow instance. | |


### Return type

**FlowStatusV1Responses**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listFlowsV1**
> ListFlowsV1Response listFlowsV1()

Responds with a list of the flows on the Corda node.

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ListFlowsV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let listFlowsV1Request: ListFlowsV1Request; // (optional)

const { status, data } = await apiInstance.listFlowsV1(
    listFlowsV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listFlowsV1Request** | **ListFlowsV1Request**|  | |


### Return type

**ListFlowsV1Response**

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

# **networkMapV1**
> Array<NodeInfo> networkMapV1()

Responds with a snapshot of the network map as provided by the Corda RPC call: net.corda.core.messaging.CordaRPCOps public abstract fun networkMapSnapshot(): List<NodeInfo>

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let body: object; // (optional)

const { status, data } = await apiInstance.networkMapV1(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**Array<NodeInfo>**

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

# **startFlowV1**
> StartFlowV1Response startFlowV1(startFlowV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    StartFlowV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let startFlowV1Request: StartFlowV1Request; //Request body for starting a flow

const { status, data } = await apiInstance.startFlowV1(
    startFlowV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **startFlowV1Request** | **StartFlowV1Request**| Request body for starting a flow | |


### Return type

**StartFlowV1Response**

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

# **startMonitorV1**
> StartMonitorV1Response startMonitorV1(startMonitorV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    StartMonitorV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let startMonitorV1Request: StartMonitorV1Request; //

const { status, data } = await apiInstance.startMonitorV1(
    startMonitorV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **startMonitorV1Request** | **StartMonitorV1Request**|  | |


### Return type

**StartMonitorV1Response**

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

# **stopMonitorV1**
> StopMonitorV1Response stopMonitorV1(stopMonitorV1Request)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    StopMonitorV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let stopMonitorV1Request: StopMonitorV1Request; //

const { status, data } = await apiInstance.stopMonitorV1(
    stopMonitorV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **stopMonitorV1Request** | **StopMonitorV1Request**|  | |


### Return type

**StopMonitorV1Response**

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

# **vaultQueryV1**
> object vaultQueryV1(vaultQueryV1Request)

Queryes the vault service for state references based on JVM class names. Custom filters are not supported by this endpoint.

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    VaultQueryV1Request
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let vaultQueryV1Request: VaultQueryV1Request; //

const { status, data } = await apiInstance.vaultQueryV1(
    vaultQueryV1Request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **vaultQueryV1Request** | **VaultQueryV1Request**|  | |


### Return type

**object**

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

