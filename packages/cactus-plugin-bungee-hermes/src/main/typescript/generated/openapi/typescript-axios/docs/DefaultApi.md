# DefaultApi

All URIs are relative to *http://localhost:3000/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createViewV1**](#createviewv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-bungee-hermes/create-view | Creates a Blockchain View.|
|[**getAvailableStrategies**](#getavailablestrategies) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-bungee-hermes/get-available-strategies | Queries plugin\&#39;s available strategies for ledger capture|
|[**getPublicKey**](#getpublickey) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-bungee-hermes/get-public-key | Queries plugin\&#39;s public key|
|[**mergeViewsV1**](#mergeviewsv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-bungee-hermes/merge-views | Merges multiple views according to a privacy policy|
|[**processViewV1**](#processviewv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-bungee-hermes/process-view | Creates a Blockchain View.|
|[**verifyMerkleRoot**](#verifymerkleroot) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-bungee-hermes/verify-merkle-root | Checks validity of merkle tree root given an input|

# **createViewV1**
> CreateViewResponse createViewV1(createViewRequest)



### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateViewRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let createViewRequest: CreateViewRequest; //

const { status, data } = await apiInstance.createViewV1(
    createViewRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createViewRequest** | **CreateViewRequest**|  | |


### Return type

**CreateViewResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Could not complete request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getAvailableStrategies**
> Array<string> getAvailableStrategies()



### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.getAvailableStrategies();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<string>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Could not complete request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPublicKey**
> GetPublicKeyResponse getPublicKey()



### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.getPublicKey();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**GetPublicKeyResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Could not complete request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **mergeViewsV1**
> MergeViewsResponse mergeViewsV1(mergeViewsRequest)



### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MergeViewsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let mergeViewsRequest: MergeViewsRequest; //

const { status, data } = await apiInstance.mergeViewsV1(
    mergeViewsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **mergeViewsRequest** | **MergeViewsRequest**|  | |


### Return type

**MergeViewsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Could not complete request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **processViewV1**
> CreateViewResponse processViewV1(processViewRequest)



### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ProcessViewRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let processViewRequest: ProcessViewRequest; //

const { status, data } = await apiInstance.processViewV1(
    processViewRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **processViewRequest** | **ProcessViewRequest**|  | |


### Return type

**CreateViewResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Could not complete request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verifyMerkleRoot**
> VerifyMerkleRootResponse verifyMerkleRoot(verifyMerkleRootRequest)



### Example

```typescript
import {
    DefaultApi,
    Configuration,
    VerifyMerkleRootRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let verifyMerkleRootRequest: VerifyMerkleRootRequest; //

const { status, data } = await apiInstance.verifyMerkleRoot(
    verifyMerkleRootRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **verifyMerkleRootRequest** | **VerifyMerkleRootRequest**|  | |


### Return type

**VerifyMerkleRootResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Could not complete request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

