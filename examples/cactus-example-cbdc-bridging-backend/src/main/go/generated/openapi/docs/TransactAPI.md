# \TransactAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Transact**](TransactAPI.md#Transact) | **Post** /api/v1/@hyperledger/cactus-example-cbdc/transact | Submit a transaction intent



## Transact

> TransactResponse Transact(ctx).TransactRequest(transactRequest).Execute()

Submit a transaction intent



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/hyperledger/cacti/examples/cactus-example-cbdc-bridging-backend/src/main/go/generated"
)

func main() {
	transactRequest := *openapiclient.NewTransactRequest("user1", "user2", *openapiclient.NewAssetType(), *openapiclient.NewAssetType(), "100") // TransactRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.TransactAPI.Transact(context.Background()).TransactRequest(transactRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TransactAPI.Transact``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Transact`: TransactResponse
	fmt.Fprintf(os.Stdout, "Response from `TransactAPI.Transact`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiTransactRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transactRequest** | [**TransactRequest**](TransactRequest.md) |  | 

### Return type

[**TransactResponse**](TransactResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

