# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**discoverNetworkV1**](#discovernetworkv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-persistence-fabric/discover-network | Refresh Fabric network structure in the database through discovery.|
|[**getStatusV1**](#getstatusv1) | **GET** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-persistence-fabric/status | Get the status of persistence plugin for fabric|

# **discoverNetworkV1**
> DiscoverNetworkResponseV1 discoverNetworkV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.discoverNetworkV1();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**DiscoverNetworkResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getStatusV1**
> StatusResponseV1 getStatusV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.getStatusV1();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**StatusResponseV1**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/plain, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

