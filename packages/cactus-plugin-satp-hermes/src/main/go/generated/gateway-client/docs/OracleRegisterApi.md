# \OracleRegisterApi

All URIs are relative to *http://localhost:3011/api/v1/@hyperledger/cactus-plugin-satp-hermes*

Method | HTTP request | Description
------------- | ------------- | -------------
[**OracleRegisterRequest**](OracleRegisterApi.md#OracleRegisterRequest) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/oracle/register | Register data transfer task



## OracleRegisterRequest

> OracleRegisterRequest200Response OracleRegisterRequest(ctx).OracleRegisterRequest(oracleRegisterRequest).Execute()

Register data transfer task



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
    oracleRegisterRequest := map[string][]openapiclient.OracleRegisterRequestOracleRegisterRequestParameter{ ... } // OracleRegisterRequestOracleRegisterRequestParameter | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.OracleRegisterApi.OracleRegisterRequest(context.Background()).OracleRegisterRequest(oracleRegisterRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `OracleRegisterApi.OracleRegisterRequest``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `OracleRegisterRequest`: OracleRegisterRequest200Response
    fmt.Fprintf(os.Stdout, "Response from `OracleRegisterApi.OracleRegisterRequest`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiOracleRegisterRequestRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **oracleRegisterRequest** | [**OracleRegisterRequestOracleRegisterRequestParameter**](OracleRegisterRequestOracleRegisterRequestParameter.md) |  | 

### Return type

[**OracleRegisterRequest200Response**](OracleRegisterRequest200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

