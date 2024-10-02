# \GetAmountApprovedAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetAmountApproved**](GetAmountApprovedAPI.md#GetAmountApproved) | **Get** /api/v1/@hyperledger/cactus-example-cbdc/get-amount-approved | Get the amount approved for a transaction



## GetAmountApproved

> string GetAmountApproved(ctx).User(user).Chain(chain).Execute()

Get the amount approved for a transaction



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
	user := "user_example" // string |  (optional)
	chain := "chain_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.GetAmountApprovedAPI.GetAmountApproved(context.Background()).User(user).Chain(chain).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GetAmountApprovedAPI.GetAmountApproved``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetAmountApproved`: string
	fmt.Fprintf(os.Stdout, "Response from `GetAmountApprovedAPI.GetAmountApproved`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetAmountApprovedRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user** | **string** |  | 
 **chain** | **string** |  | 

### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

