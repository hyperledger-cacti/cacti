# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**addNodeToConsortiumV1**](#addnodetoconsortiumv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-consortium-static/add-node | Adds a node to consortium JWS|
|[**getConsortiumJwsV1**](#getconsortiumjwsv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-consortium-static/consortium/jws | Retrieves a consortium JWS|
|[**getNodeJwsV1**](#getnodejwsv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-consortium-static/node/jws | Retrieves the JWT of a Cactus Node|
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-consortium-static/get-prometheus-exporter-metrics | Get the Prometheus Metrics|
|[**receiveBroadcastV1**](#receivebroadcastv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cacti-plugin-consortium-static/receive-broadcast | Adds a node to consortium JWS|

# **addNodeToConsortiumV1**
> GetConsortiumJwsResponse addNodeToConsortiumV1()



### Example

```typescript
import {
    DefaultApi,
    Configuration,
    NewNodeRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let newNodeRequestV1: NewNodeRequestV1; // (optional)

const { status, data } = await apiInstance.addNodeToConsortiumV1(
    newNodeRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **newNodeRequestV1** | **NewNodeRequestV1**|  | |


### Return type

**GetConsortiumJwsResponse**

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

# **getConsortiumJwsV1**
> GetConsortiumJwsResponse getConsortiumJwsV1()

The JWS asserting the consortium metadata (pub keys and hosts of nodes)

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let body: object; // (optional)

const { status, data } = await apiInstance.getConsortiumJwsV1(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**GetConsortiumJwsResponse**

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

# **getNodeJwsV1**
> GetNodeJwsResponse getNodeJwsV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let body: object; // (optional)

const { status, data } = await apiInstance.getNodeJwsV1(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**GetNodeJwsResponse**

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

# **receiveBroadcastV1**
> BroadcastResponseV1 receiveBroadcastV1()



### Example

```typescript
import {
    DefaultApi,
    Configuration,
    BroadcastRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let broadcastRequestV1: BroadcastRequestV1; // (optional)

const { status, data } = await apiInstance.receiveBroadcastV1(
    broadcastRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **broadcastRequestV1** | **BroadcastRequestV1**|  | |


### Return type

**BroadcastResponseV1**

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

