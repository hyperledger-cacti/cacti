# \AdminApi

All URIs are relative to *http://localhost:3011/api/v1/@hyperledger/cactus-plugin-satp-hermes*

Method | HTTP request | Description
------------- | ------------- | -------------
[**CallContinue**](AdminApi.md#CallContinue) | **Post** /api/v1/@hyperledger/cactus-plugin-satp-hermes/continue | Continue a paused transaction session
[**GetAudit**](AdminApi.md#GetAudit) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/audit | Audit transactions
[**GetStatus**](AdminApi.md#GetStatus) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/status | Get SATP current session data
[**Pause**](AdminApi.md#Pause) | **Post** /api/v1/@hyperledger/cactus-plugin-satp-hermes/pause | Pause a transaction session



## CallContinue

> Continue200Response CallContinue(ctx).ContinueRequest(continueRequest).Execute()

Continue a paused transaction session



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
    continueRequest := *openapiclient.NewContinueRequest("SessionId_example", "ContextId_example") // ContinueRequest | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AdminApi.CallContinue(context.Background()).ContinueRequest(continueRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AdminApi.CallContinue``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `CallContinue`: Continue200Response
    fmt.Fprintf(os.Stdout, "Response from `AdminApi.CallContinue`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCallContinueRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **continueRequest** | [**ContinueRequest**](ContinueRequest.md) |  | 

### Return type

[**Continue200Response**](Continue200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetAudit

> GetAudit200Response GetAudit(ctx).AuditStartDate(auditStartDate).AuditEndDate(auditEndDate).IncludeProofs(includeProofs).Execute()

Audit transactions



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"
    openapiclient "github.com/hyperledger/cacti/packages/cactus-plugin-satp-hermes/src/main/go/generated"
)

func main() {
    auditStartDate := time.Now() // time.Time | The start date for the audit period. (optional)
    auditEndDate := time.Now() // time.Time | The end date for the audit period. (optional)
    includeProofs := true // bool | Include proofs generated from each gateway transaction. (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AdminApi.GetAudit(context.Background()).AuditStartDate(auditStartDate).AuditEndDate(auditEndDate).IncludeProofs(includeProofs).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AdminApi.GetAudit``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetAudit`: GetAudit200Response
    fmt.Fprintf(os.Stdout, "Response from `AdminApi.GetAudit`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetAuditRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **auditStartDate** | **time.Time** | The start date for the audit period. | 
 **auditEndDate** | **time.Time** | The end date for the audit period. | 
 **includeProofs** | **bool** | Include proofs generated from each gateway transaction. | 

### Return type

[**GetAudit200Response**](GetAudit200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetStatus

> Transact200ResponseStatusResponse GetStatus(ctx).SessionID(sessionID).Execute()

Get SATP current session data



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
    sessionID := "000003e8-e0b8-21ee-ba00-325096b39f47" // string | Unique identifier for the session.

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AdminApi.GetStatus(context.Background()).SessionID(sessionID).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AdminApi.GetStatus``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetStatus`: Transact200ResponseStatusResponse
    fmt.Fprintf(os.Stdout, "Response from `AdminApi.GetStatus`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetStatusRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **sessionID** | **string** | Unique identifier for the session. | 

### Return type

[**Transact200ResponseStatusResponse**](Transact200ResponseStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Pause

> Pause200Response Pause(ctx).PauseRequest(pauseRequest).Execute()

Pause a transaction session



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
    pauseRequest := *openapiclient.NewPauseRequest() // PauseRequest | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AdminApi.Pause(context.Background()).PauseRequest(pauseRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AdminApi.Pause``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `Pause`: Pause200Response
    fmt.Fprintf(os.Stdout, "Response from `AdminApi.Pause`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPauseRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **pauseRequest** | [**PauseRequest**](PauseRequest.md) |  | 

### Return type

[**Pause200Response**](Pause200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

