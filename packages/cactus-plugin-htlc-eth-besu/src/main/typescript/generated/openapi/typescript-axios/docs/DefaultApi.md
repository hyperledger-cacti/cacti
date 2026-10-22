# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getSingleStatusV1**](#getsinglestatusv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-eth-besu/get-single-status | |
|[**getStatusV1**](#getstatusv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-eth-besu/get-status | |
|[**initializeV1**](#initializev1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-eth-besu/initialize | |
|[**newContractV1**](#newcontractv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-eth-besu/new-contract | |
|[**refundV1**](#refundv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-eth-besu/refund | |
|[**withdrawV1**](#withdrawv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-eth-besu/withdraw | |

# **getSingleStatusV1**
> number getSingleStatusV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetSingleStatusRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getSingleStatusRequest: GetSingleStatusRequest; // (optional)

const { status, data } = await apiInstance.getSingleStatusV1(
    getSingleStatusRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getSingleStatusRequest** | **GetSingleStatusRequest**|  | |


### Return type

**number**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Status |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getStatusV1**
> Array<number> getStatusV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GetStatusRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let getStatusRequest: GetStatusRequest; // (optional)

const { status, data } = await apiInstance.getStatusV1(
    getStatusRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **getStatusRequest** | **GetStatusRequest**|  | |


### Return type

**Array<number>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Array of status |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **initializeV1**
> RunTransactionResponse initializeV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    InitializeRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let initializeRequest: InitializeRequest; // (optional)

const { status, data } = await apiInstance.initializeV1(
    initializeRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **initializeRequest** | **InitializeRequest**|  | |


### Return type

**RunTransactionResponse**

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

# **newContractV1**
> InvokeContractV1Response newContractV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    NewContractObj
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let newContractObj: NewContractObj; // (optional)

const { status, data } = await apiInstance.newContractV1(
    newContractObj
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **newContractObj** | **NewContractObj**|  | |


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

# **refundV1**
> InvokeContractV1Response refundV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    RefundReq
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let refundReq: RefundReq; // (optional)

const { status, data } = await apiInstance.refundV1(
    refundReq
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **refundReq** | **RefundReq**|  | |


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

# **withdrawV1**
> InvokeContractV1Response withdrawV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    WithdrawReq
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let withdrawReq: WithdrawReq; // (optional)

const { status, data } = await apiInstance.withdrawV1(
    withdrawReq
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **withdrawReq** | **WithdrawReq**|  | |


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

