# \ApproveAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Approve**](ApproveAPI.md#Approve) | **Post** /api/v1/@hyperledger/cactus-example-cbdc/approve-tokens | Submit a transaction intent



## Approve

> Approve(ctx).ApproveRequest(approveRequest).Execute()

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
	approveRequest := *openapiclient.NewApproveRequest("user1", "100", *openapiclient.NewAssetType()) // ApproveRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.ApproveAPI.Approve(context.Background()).ApproveRequest(approveRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ApproveAPI.Approve``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiApproveRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **approveRequest** | [**ApproveRequest**](ApproveRequest.md) |  | 

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

