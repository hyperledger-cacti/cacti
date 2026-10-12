# TransactionApi

All URIs are relative to *http://localhost:3011*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**cancel**](#cancel) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/cancel | Cancel a transaction session|
|[**getIntegrations**](#getintegrations) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/integrations | Get supported integrations|
|[**getRoutes**](#getroutes) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/routes | Get a list of routes for a gateway-to-gateway asset transfer|
|[**transact**](#transact) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact | Submit a transaction intent|

# **cancel**
> Cancel200Response cancel(cancelRequest)

Attempts to cancel a previously submitted transaction intent using its session ID.

### Example

```typescript
import {
    TransactionApi,
    Configuration,
    CancelRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let cancelRequest: CancelRequest; //Cancel request object.

const { status, data } = await apiInstance.cancel(
    cancelRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **cancelRequest** | **CancelRequest**| Cancel request object. | |


### Return type

**Cancel200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Transaction cancellation attempted |  -  |
|**0** | An error occurred or transaction cannot be cancelled |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getIntegrations**
> GetIntegrations200Response getIntegrations()

Retrieves metadata about each supported blockchain networks, chains, and other systems.

### Example

```typescript
import {
    TransactionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

const { status, data } = await apiInstance.getIntegrations();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**GetIntegrations200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of supported systems. |  -  |
|**0** | An error occurred |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRoutes**
> GetRoutes200Response getRoutes()

Get a list of possible routes for swapping one asset for another across multiple exchanges

### Example

```typescript
import {
    TransactionApi,
    Configuration,
    TransactRequestSourceAssetNetworkId,
    TransactRequestSourceAssetNetworkId
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let fromNetworkID: TransactRequestSourceAssetNetworkId; //The sending DLT Network. (default to undefined)
let fromAmount: string; //The amount that should be sent including all decimals. (default to undefined)
let fromToken: string; //The token that should be transferred. Can be the address or the symbol. (default to undefined)
let toDLTNetwork: TransactRequestSourceAssetNetworkId; //The receiving DLT Network. (default to undefined)
let toToken: string; //The token that should be transferred to. Can be the address or the symbol. (default to undefined)
let fromAddress: string; //The sending wallet address. (default to undefined)
let toAddress: string; //The receiving wallet address. If none is provided, the fromAddress will be used. (default to undefined)

const { status, data } = await apiInstance.getRoutes(
    fromNetworkID,
    fromAmount,
    fromToken,
    toDLTNetwork,
    toToken,
    fromAddress,
    toAddress
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **fromNetworkID** | **TransactRequestSourceAssetNetworkId** | The sending DLT Network. | defaults to undefined|
| **fromAmount** | [**string**] | The amount that should be sent including all decimals. | defaults to undefined|
| **fromToken** | [**string**] | The token that should be transferred. Can be the address or the symbol. | defaults to undefined|
| **toDLTNetwork** | **TransactRequestSourceAssetNetworkId** | The receiving DLT Network. | defaults to undefined|
| **toToken** | [**string**] | The token that should be transferred to. Can be the address or the symbol. | defaults to undefined|
| **fromAddress** | [**string**] | The sending wallet address. | defaults to undefined|
| **toAddress** | [**string**] | The receiving wallet address. If none is provided, the fromAddress will be used. | defaults to undefined|


### Return type

**GetRoutes200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**0** | An error occurred |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **transact**
> Transact200Response transact(transactRequest)

Allows users to queue intents for transactions based on specified parameters.

### Example

```typescript
import {
    TransactionApi,
    Configuration,
    TransactRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let transactRequest: TransactRequest; //Transact request object.

const { status, data } = await apiInstance.transact(
    transactRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **transactRequest** | **TransactRequest**| Transact request object. | |


### Return type

**Transact200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Transaction successfully queued |  -  |
|**0** | An error occurred |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

