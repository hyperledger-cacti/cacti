# DefaultApi

All URIs are relative to *https://www.cactus.stream*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getObjectV1**](#getobjectv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-object-store-ipfs/get-object | Retrieves an object from the object store.|
|[**hasObjectV1**](#hasobjectv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-object-store-ipfs/has-object | Checks the presence of an object in the object store.|
|[**setObjectV1**](#setobjectv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-object-store-ipfs/set-object | Sets an object in the object store under the specified key.|

# **getObjectV1**
> GetObjectResponseV1 getObjectV1(getObjectRequestV1)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetObjectRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getObjectRequestV1: GetObjectRequestV1; //Request body to obtain an object via its key.

const { status, data } = await apiInstance.getObjectV1(
    getObjectRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getObjectRequestV1** | **GetObjectRequestV1**| Request body to obtain an object via its key. | |


### Return type

**GetObjectResponseV1**

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

# **hasObjectV1**
> HasObjectResponseV1 hasObjectV1(hasObjectRequestV1)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    HasObjectRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let hasObjectRequestV1: HasObjectRequestV1; //Request body to check presence of an object under a key.

const { status, data } = await apiInstance.hasObjectV1(
    hasObjectRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **hasObjectRequestV1** | **HasObjectRequestV1**| Request body to check presence of an object under a key. | |


### Return type

**HasObjectResponseV1**

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

# **setObjectV1**
> SetObjectResponseV1 setObjectV1(setObjectRequestV1)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    SetObjectRequestV1
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let setObjectRequestV1: SetObjectRequestV1; //Request body to set an object under a key.

const { status, data } = await apiInstance.setObjectV1(
    setObjectRequestV1
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setObjectRequestV1** | **SetObjectRequestV1**| Request body to set an object under a key. | |


### Return type

**SetObjectResponseV1**

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

