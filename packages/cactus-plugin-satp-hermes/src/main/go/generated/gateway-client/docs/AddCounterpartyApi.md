# \AddCounterpartyApi

All URIs are relative to *http://localhost:3011/api/v1/@hyperledger/cactus-plugin-satp-hermes*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddCounterparty**](AddCounterpartyApi.md#AddCounterparty) | **Post** /api/v1/@hyperledger/cactus-plugin-satp-hermes/add-counterparty-gateway | Add counterparty



## AddCounterparty

> AddCounterparty200Response AddCounterparty(ctx).AddCounterpartyRequest(addCounterpartyRequest).Execute()

Add counterparty



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
    addCounterpartyRequest := *openapiclient.NewAddCounterpartyRequest(*openapiclient.NewAddCounterpartyRequestCounterparty("Id_example", "PubKey_example", "Name_example", []openapiclient.AddCounterpartyRequestCounterpartyVersionInner{*openapiclient.NewAddCounterpartyRequestCounterpartyVersionInner()}, []openapiclient.TransactRequestSourceAssetNetworkId{*openapiclient.NewTransactRequestSourceAssetNetworkId("Id_example", "LedgerType_example")}, "ProofID_example", int32(123), int32(123), "0x102A0F6D9F0F507288fE1e26740cFaD61184CCC7")) // AddCounterpartyRequest | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AddCounterpartyApi.AddCounterparty(context.Background()).AddCounterpartyRequest(addCounterpartyRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AddCounterpartyApi.AddCounterparty``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `AddCounterparty`: AddCounterparty200Response
    fmt.Fprintf(os.Stdout, "Response from `AddCounterpartyApi.AddCounterparty`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddCounterpartyRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **addCounterpartyRequest** | [**AddCounterpartyRequest**](AddCounterpartyRequest.md) |  | 

### Return type

[**AddCounterparty200Response**](AddCounterparty200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

