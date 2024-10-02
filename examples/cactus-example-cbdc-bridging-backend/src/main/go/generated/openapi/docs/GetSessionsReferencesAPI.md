# \GetSessionsReferencesAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetSessionsReferences**](GetSessionsReferencesAPI.md#GetSessionsReferences) | **Get** /api/v1/@hyperledger/cactus-example-cbdc/get-sessions-references | Get SATP current sessions data



## GetSessionsReferences

> []SessionReference GetSessionsReferences(ctx).Ledger(ledger).Execute()

Get SATP current sessions data



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
	ledger := "ledger_example" // string | Unique identifier for the session. (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.GetSessionsReferencesAPI.GetSessionsReferences(context.Background()).Ledger(ledger).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GetSessionsReferencesAPI.GetSessionsReferences``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetSessionsReferences`: []SessionReference
	fmt.Fprintf(os.Stdout, "Response from `GetSessionsReferencesAPI.GetSessionsReferences`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetSessionsReferencesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ledger** | **string** | Unique identifier for the session. | 

### Return type

[**[]SessionReference**](SessionReference.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

