# DefaultApi

All URIs are relative to *https://www.cactus.stream*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**counterpartyHtlcV1**](#counterpartyhtlcv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-coordinator-besu/counterparty-htlc | Create an instance to interact with the counterparty HTLC|
|[**ownHtlcV1**](#ownhtlcv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-coordinator-besu/own-htlc | Create an instance to interact with the own HTLC.|
|[**withdrawCounterpartyV1**](#withdrawcounterpartyv1) | **POST** /api/v1/plugins/@hyperledger-cacti/cactus-plugin-htlc-coordinator-besu/withdraw-counterparty | Withdraw funds of the counterparty HTLC|

# **counterpartyHtlcV1**
> any counterpartyHtlcV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CounterpartyHTLCRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let counterpartyHTLCRequest: CounterpartyHTLCRequest; // (optional)

const { status, data } = await apiInstance.counterpartyHtlcV1(
    counterpartyHTLCRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **counterpartyHTLCRequest** | **CounterpartyHTLCRequest**|  | |


### Return type

**any**

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

# **ownHtlcV1**
> any ownHtlcV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    OwnHTLCRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let ownHTLCRequest: OwnHTLCRequest; // (optional)

const { status, data } = await apiInstance.ownHtlcV1(
    ownHTLCRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **ownHTLCRequest** | **OwnHTLCRequest**|  | |


### Return type

**any**

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

# **withdrawCounterpartyV1**
> any withdrawCounterpartyV1()


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    WithdrawCounterpartyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let withdrawCounterpartyRequest: WithdrawCounterpartyRequest; // (optional)

const { status, data } = await apiInstance.withdrawCounterpartyV1(
    withdrawCounterpartyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **withdrawCounterpartyRequest** | **WithdrawCounterpartyRequest**|  | |


### Return type

**any**

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

