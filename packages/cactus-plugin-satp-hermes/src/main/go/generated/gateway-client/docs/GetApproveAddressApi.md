# \GetApproveAddressApi

All URIs are relative to *http://localhost:3011/api/v1/@hyperledger/cactus-plugin-satp-hermes*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetApproveAddress**](GetApproveAddressApi.md#GetApproveAddress) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/approve-address | Get approve address



## GetApproveAddress

> GetApproveAddress200Response GetApproveAddress(ctx).NetworkID(networkID).TokenType(tokenType).Execute()

Get approve address



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/hyperledger/cacti/packages/cactus-plugin-satp-hermes/src/main/go/generated"
)

func main() {
    networkID := map[string][]openapiclient.TransactRequestSourceAssetNetworkId{ ... } // TransactRequestSourceAssetNetworkId | 
    tokenType := "tokenType_example" // string | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.GetApproveAddressApi.GetApproveAddress(context.Background()).NetworkID(networkID).TokenType(tokenType).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `GetApproveAddressApi.GetApproveAddress``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetApproveAddress`: GetApproveAddress200Response
    fmt.Fprintf(os.Stdout, "Response from `GetApproveAddressApi.GetApproveAddress`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetApproveAddressRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **networkID** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
 **tokenType** | **string** |  | 

### Return type

[**GetApproveAddress200Response**](GetApproveAddress200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

