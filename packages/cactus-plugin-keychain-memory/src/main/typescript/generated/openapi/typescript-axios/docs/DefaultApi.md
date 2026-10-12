# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**deleteKeychainEntryV1**](#deletekeychainentryv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-keychain-memory/delete-keychain-entry | Deletes an entry under a key on the keychain backend.|
|[**getKeychainEntryV1**](#getkeychainentryv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-keychain-memory/get-keychain-entry | Retrieves the contents of a keychain entry from the backend.|
|[**getPrometheusMetricsV1**](#getprometheusmetricsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-keychain-memory/get-prometheus-exporter-metrics | Get the Prometheus Metrics|
|[**hasKeychainEntryV1**](#haskeychainentryv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-keychain-memory/has-keychain-entry | Checks that an entry exists under a key on the keychain backend|
|[**setKeychainEntryV1**](#setkeychainentryv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-keychain-memory/set-keychain-entry | Sets a value under a key on the keychain backend.|

# **deleteKeychainEntryV1**
> DeleteKeychainEntryResponseV1 deleteKeychainEntryV1(deleteKeychainEntryRequestV1)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    DeleteKeychainEntryRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let deleteKeychainEntryRequestV1: DeleteKeychainEntryRequestV1; //Request body to delete a keychain entry via its key

const { status, data } = await apiInstance.deleteKeychainEntryV1(
    deleteKeychainEntryRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deleteKeychainEntryRequestV1** | **DeleteKeychainEntryRequestV1**| Request body to delete a keychain entry via its key | |


### Return type

**DeleteKeychainEntryResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad request. Key must be a string and longer than 0, shorter than 1024 characters. |  -  |
|**401** | Authorization information is missing or invalid. |  -  |
|**500** | Unexpected error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getKeychainEntryV1**
> GetKeychainEntryResponseV1 getKeychainEntryV1(getKeychainEntryRequestV1)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetKeychainEntryRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getKeychainEntryRequestV1: GetKeychainEntryRequestV1; //Request body to obtain a keychain entry via its key

const { status, data } = await apiInstance.getKeychainEntryV1(
    getKeychainEntryRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getKeychainEntryRequestV1** | **GetKeychainEntryRequestV1**| Request body to obtain a keychain entry via its key | |


### Return type

**GetKeychainEntryResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad request. Key must be a string and longer than 0, shorter than 1024 characters. |  -  |
|**401** | Authorization information is missing or invalid. |  -  |
|**404** | A keychain item with the specified key was not found. |  -  |
|**500** | Unexpected error. |  -  |

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

# **hasKeychainEntryV1**
> HasKeychainEntryResponseV1 hasKeychainEntryV1(hasKeychainEntryRequestV1)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    HasKeychainEntryRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let hasKeychainEntryRequestV1: HasKeychainEntryRequestV1; //Request body for checking a keychain entry via its key

const { status, data } = await apiInstance.hasKeychainEntryV1(
    hasKeychainEntryRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **hasKeychainEntryRequestV1** | **HasKeychainEntryRequestV1**| Request body for checking a keychain entry via its key | |


### Return type

**HasKeychainEntryResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad request. Key must be a string and longer than 0, shorter than 1024 characters. |  -  |
|**401** | Authorization information is missing or invalid. |  -  |
|**500** | Unexpected error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **setKeychainEntryV1**
> SetKeychainEntryResponseV1 setKeychainEntryV1(setKeychainEntryRequestV1)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    SetKeychainEntryRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let setKeychainEntryRequestV1: SetKeychainEntryRequestV1; //Request body to write/update a keychain entry via its key

const { status, data } = await apiInstance.setKeychainEntryV1(
    setKeychainEntryRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setKeychainEntryRequestV1** | **SetKeychainEntryRequestV1**| Request body to write/update a keychain entry via its key | |


### Return type

**SetKeychainEntryResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad request. Key must be a string and longer than 0, shorter than 1024 characters. |  -  |
|**401** | Authorization information is missing or invalid. |  -  |
|**500** | Unexpected error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

