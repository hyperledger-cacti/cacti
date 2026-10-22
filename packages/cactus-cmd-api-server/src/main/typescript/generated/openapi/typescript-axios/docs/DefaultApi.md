# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getHealthCheckV1**](#gethealthcheckv1) | **GET** /api/v1/api-server/healthcheck | Can be used to verify liveness of an API server instance|
|[**getOpenApiSpecV1**](#getopenapispecv1) | **GET** /api/v1/api-server/get-open-api-spec | |
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/api-server/get-prometheus-exporter-metrics | Get the Prometheus Metrics|

# **getHealthCheckV1**
> HealthCheckResponse getHealthCheckV1()

Returns the current timestamp of the API server as proof of health/liveness

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.getHealthCheckV1();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HealthCheckResponse**

### Authorization

[bearerTokenAuth](../README.md#bearerTokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized - Invalid token |  -  |
|**403** | Forbidden - Valid token but missing correct scope |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getOpenApiSpecV1**
> string getOpenApiSpecV1()

Returns the openapi.json document of specific plugin.

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

[bearerTokenAuth](../README.md#bearerTokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized - Invalid token |  -  |
|**403** | Forbidden - Valid token but missing correct scope |  -  |

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

[bearerTokenAuth](../README.md#bearerTokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/plain, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized - Invalid token |  -  |
|**403** | Forbidden - Valid token but missing correct scope |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

