# \TransactionApi

All URIs are relative to *http://localhost:3011/api/v1/@hyperledger/cactus-plugin-satp-hermes*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Cancel**](TransactionApi.md#Cancel) | **Post** /api/v1/@hyperledger/cactus-plugin-satp-hermes/cancel | Cancel a transaction session
[**GetIntegrations**](TransactionApi.md#GetIntegrations) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations | Get supported integrations
[**GetRoutes**](TransactionApi.md#GetRoutes) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/routes | Get a list of routes for a gateway-to-gateway asset transfer
[**Transact**](TransactionApi.md#Transact) | **Post** /api/v1/@hyperledger/cactus-plugin-satp-hermes/transact | Submit a transaction intent



## Cancel

> Cancel200Response Cancel(ctx).CancelRequest(cancelRequest).Execute()

Cancel a transaction session



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
    cancelRequest := *openapiclient.NewCancelRequest("000003e8-e0b8-21ee-ba00-325096b39f47") // CancelRequest | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TransactionApi.Cancel(context.Background()).CancelRequest(cancelRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TransactionApi.Cancel``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `Cancel`: Cancel200Response
    fmt.Fprintf(os.Stdout, "Response from `TransactionApi.Cancel`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCancelRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cancelRequest** | [**CancelRequest**](CancelRequest.md) |  | 

### Return type

[**Cancel200Response**](Cancel200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetIntegrations

> []Chains1Inner GetIntegrations(ctx).Execute()

Get supported integrations



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

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TransactionApi.GetIntegrations(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TransactionApi.GetIntegrations``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetIntegrations`: []Chains1Inner
    fmt.Fprintf(os.Stdout, "Response from `TransactionApi.GetIntegrations`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetIntegrationsRequest struct via the builder pattern


### Return type

[**[]Chains1Inner**](Chains1Inner.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetRoutes

> GetRoutes200Response GetRoutes(ctx).FromNetworkID(fromNetworkID).FromAmount(fromAmount).FromToken(fromToken).ToDLTNetwork(toDLTNetwork).ToToken(toToken).FromAddress(fromAddress).ToAddress(toAddress).Execute()

Get a list of routes for a gateway-to-gateway asset transfer



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
    fromNetworkID := "fromNetworkID_example" // string | The sending DLT Network.
    fromAmount := "1000000000000000000" // string | The amount that should be sent including all decimals.
    fromToken := "0x102A0F6D9F0F507288fE1e26740cFaD61184CCC7" // string | The token that should be transferred. Can be the address or the symbol.
    toDLTNetwork := "toDLTNetwork_example" // string | The receiving DLT Network.
    toToken := "0x102A0F6D9F0F507288fE1e26740cFaD61184CCC7" // string | The token that should be transferred to. Can be the address or the symbol.
    fromAddress := "0x102A0F6D9F0F507288fE1e26740cFaD61184CCC7" // string | The sending wallet address.
    toAddress := "0x102A0F6D9F0F507288fE1e26740cFaD61184CCC7" // string | The receiving wallet address. If none is provided, the fromAddress will be used.

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TransactionApi.GetRoutes(context.Background()).FromNetworkID(fromNetworkID).FromAmount(fromAmount).FromToken(fromToken).ToDLTNetwork(toDLTNetwork).ToToken(toToken).FromAddress(fromAddress).ToAddress(toAddress).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TransactionApi.GetRoutes``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetRoutes`: GetRoutes200Response
    fmt.Fprintf(os.Stdout, "Response from `TransactionApi.GetRoutes`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetRoutesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **fromNetworkID** | **string** | The sending DLT Network. | 
 **fromAmount** | **string** | The amount that should be sent including all decimals. | 
 **fromToken** | **string** | The token that should be transferred. Can be the address or the symbol. | 
 **toDLTNetwork** | **string** | The receiving DLT Network. | 
 **toToken** | **string** | The token that should be transferred to. Can be the address or the symbol. | 
 **fromAddress** | **string** | The sending wallet address. | 
 **toAddress** | **string** | The receiving wallet address. If none is provided, the fromAddress will be used. | 

### Return type

[**GetRoutes200Response**](GetRoutes200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Transact

> Transact200Response Transact(ctx).TransactRequest(transactRequest).Execute()

Submit a transaction intent



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
    transactRequest := *openapiclient.NewTransactRequest("123e4567-e89b-12d3-a456-426614174000", "transfer") // TransactRequest | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TransactionApi.Transact(context.Background()).TransactRequest(transactRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TransactionApi.Transact``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `Transact`: Transact200Response
    fmt.Fprintf(os.Stdout, "Response from `TransactionApi.Transact`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiTransactRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transactRequest** | [**TransactRequest**](TransactRequest.md) |  | 

### Return type

[**Transact200Response**](Transact200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

