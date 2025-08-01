# \MintAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Mint**](MintAPI.md#Mint) | **Post** /api/v1/@hyperledger/cactus-example-cbdc/mint-tokens | Submit a transaction intent



## Mint

> Mint(ctx).MintRequest(mintRequest).Execute()

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
	mintRequest := *openapiclient.NewMintRequest("user1", "100", *openapiclient.NewAssetType()) // MintRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.MintAPI.Mint(context.Background()).MintRequest(mintRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MintAPI.Mint``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiMintRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **mintRequest** | [**MintRequest**](MintRequest.md) |  | 

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

