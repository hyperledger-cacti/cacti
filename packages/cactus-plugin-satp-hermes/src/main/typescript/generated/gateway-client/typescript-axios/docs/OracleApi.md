# OracleApi

All URIs are relative to *http://localhost:3011*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**executeOracleTask**](#executeoracletask) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/oracle/execute | Execute data transfer task|
|[**getOracleTaskStatus**](#getoracletaskstatus) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/oracle/status | Get oracle task status|
|[**registerOracleTask**](#registeroracletask) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/oracle/register | Register data transfer task|
|[**unregisterOracleTask**](#unregisteroracletask) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/oracle/unregister | Unregister data transfer task|

# **executeOracleTask**
> ExecuteOracleTask200Response executeOracleTask(executeOracleTaskRequest)

Execute a registered data transfer task from source to target blockchain

### Example

```typescript
import {
    OracleApi,
    Configuration,
    ExecuteOracleTaskRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OracleApi(configuration);

let executeOracleTaskRequest: ExecuteOracleTaskRequest; //Execute request object.

const { status, data } = await apiInstance.executeOracleTask(
    executeOracleTaskRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **executeOracleTaskRequest** | **ExecuteOracleTaskRequest**| Execute request object. | |


### Return type

**ExecuteOracleTask200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Response schema for executing a data transfer task. |  -  |
|**400** | Bad request |  -  |
|**404** | Task not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getOracleTaskStatus**
> GetOracleTaskStatus200Response getOracleTaskStatus()

Retrieve the status of an oracle task

### Example

```typescript
import {
    OracleApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OracleApi(configuration);

let taskID: string; //Unique identifier for the task. (default to undefined)

const { status, data } = await apiInstance.getOracleTaskStatus(
    taskID
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **taskID** | [**string**] | Unique identifier for the task. | defaults to undefined|


### Return type

**GetOracleTaskStatus200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad request |  -  |
|**404** | Transaction not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **registerOracleTask**
> RegisterOracleTask200Response registerOracleTask(registerOracleTaskRequest)

Register data transfer from source to target blockchain

### Example

```typescript
import {
    OracleApi,
    Configuration,
    RegisterOracleTaskRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OracleApi(configuration);

let registerOracleTaskRequest: RegisterOracleTaskRequest; //Register request object.

const { status, data } = await apiInstance.registerOracleTask(
    registerOracleTaskRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **registerOracleTaskRequest** | **RegisterOracleTaskRequest**| Register request object. | |


### Return type

**RegisterOracleTask200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Response schema for registering a data transfer task. |  -  |
|**400** | Bad request |  -  |
|**404** | Transaction not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **unregisterOracleTask**
> UnregisterOracleTask200Response unregisterOracleTask()

Unregister data transfer task from source to target blockchain

### Example

```typescript
import {
    OracleApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OracleApi(configuration);

let taskID: string; //Unique identifier for the task. (default to undefined)

const { status, data } = await apiInstance.unregisterOracleTask(
    taskID
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **taskID** | [**string**] | Unique identifier for the task. | defaults to undefined|


### Return type

**UnregisterOracleTask200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Response schema for unregistering a data transfer task. |  -  |
|**400** | Bad request |  -  |
|**404** | Transaction not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

