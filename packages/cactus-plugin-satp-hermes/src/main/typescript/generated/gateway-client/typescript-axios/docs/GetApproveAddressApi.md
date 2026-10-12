# GetApproveAddressApi

All URIs are relative to *http://localhost:3011*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getApproveAddress**](#getapproveaddress) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/approve-address | Get approve address|

# **getApproveAddress**
> GetApproveAddress200Response getApproveAddress()

Get approve address for the token transfer

### Example

```typescript
import {
    GetApproveAddressApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new GetApproveAddressApi(configuration);

let networkIdId: string; //The id of the DLT network being interacted with. (default to undefined)
let networkIdLedgerType: 'BESU_1X' | 'BESU_2X' | 'BURROW_0X' | 'CORDA_4X' | 'ETHEREUM' | 'FABRIC_2' | 'SAWTOOTH_1X'; //The ledger type of the DLT network being interacted with. (default to undefined)
let tokenType: 'NONSTANDARD_FUNGIBLE' | 'NONSTANDARD_NONFUNGIBLE'; //The type of token being transferred. (default to undefined)

const { status, data } = await apiInstance.getApproveAddress(
    networkIdId,
    networkIdLedgerType,
    tokenType
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **networkIdId** | [**string**] | The id of the DLT network being interacted with. | defaults to undefined|
| **networkIdLedgerType** | [**&#39;BESU_1X&#39; | &#39;BESU_2X&#39; | &#39;BURROW_0X&#39; | &#39;CORDA_4X&#39; | &#39;ETHEREUM&#39; | &#39;FABRIC_2&#39; | &#39;SAWTOOTH_1X&#39;**]**Array<&#39;BESU_1X&#39; &#124; &#39;BESU_2X&#39; &#124; &#39;BURROW_0X&#39; &#124; &#39;CORDA_4X&#39; &#124; &#39;ETHEREUM&#39; &#124; &#39;FABRIC_2&#39; &#124; &#39;SAWTOOTH_1X&#39;>** | The ledger type of the DLT network being interacted with. | defaults to undefined|
| **tokenType** | [**&#39;NONSTANDARD_FUNGIBLE&#39; | &#39;NONSTANDARD_NONFUNGIBLE&#39;**]**Array<&#39;NONSTANDARD_FUNGIBLE&#39; &#124; &#39;NONSTANDARD_NONFUNGIBLE&#39;>** | The type of token being transferred. | defaults to undefined|


### Return type

**GetApproveAddress200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Approve address for the token transfer |  -  |
|**400** | Bad request |  -  |
|**404** | Approve address not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

