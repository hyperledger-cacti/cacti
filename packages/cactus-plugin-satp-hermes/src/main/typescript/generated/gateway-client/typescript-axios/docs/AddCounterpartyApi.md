# AddCounterpartyApi

All URIs are relative to *http://localhost:3011*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**addCounterparty**](#addcounterparty) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/add-counterparty-gateway | Add counterparty|

# **addCounterparty**
> AddCounterparty200Response addCounterparty(addCounterpartyRequest)

Add a counterparty to the Gateway

### Example

```typescript
import {
    AddCounterpartyApi,
    Configuration,
    AddCounterpartyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AddCounterpartyApi(configuration);

let addCounterpartyRequest: AddCounterpartyRequest; //Add counterparty request object.

const { status, data } = await apiInstance.addCounterparty(
    addCounterpartyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **addCounterpartyRequest** | **AddCounterpartyRequest**| Add counterparty request object. | |


### Return type

**AddCounterparty200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Counterparty added successfully |  -  |
|**400** | Bad request |  -  |
|**404** | Counterparty not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

