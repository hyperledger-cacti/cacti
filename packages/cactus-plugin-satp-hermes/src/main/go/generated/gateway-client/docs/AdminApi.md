# \AdminApi

All URIs are relative to *http://localhost:3011/api/v1/@hyperledger/cactus-plugin-satp-hermes*

Method | HTTP request | Description
------------- | ------------- | -------------
[**CallContinue**](AdminApi.md#CallContinue) | **Post** /api/v1/@hyperledger/cactus-plugin-satp-hermes/continue | Continue a paused transaction session
[**GetHealthCheck**](AdminApi.md#GetHealthCheck) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | Health check endpoint
[**GetSessionIds**](AdminApi.md#GetSessionIds) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids | Get SATP session ids
[**GetStatus**](AdminApi.md#GetStatus) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/status | Get SATP current session data
[**Pause**](AdminApi.md#Pause) | **Post** /api/v1/@hyperledger/cactus-plugin-satp-hermes/pause | Pause a transaction session
[**PerformAudit**](AdminApi.md#PerformAudit) | **Get** /api/v1/@hyperledger/cactus-plugin-satp-hermes/audit | Audit transactions



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


## GetHealthCheck

> GetHealthCheck200Response GetHealthCheck(ctx).Execute()

Health check endpoint



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
    resp, r, err := apiClient.AdminApi.GetHealthCheck(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AdminApi.GetHealthCheck``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetHealthCheck`: GetHealthCheck200Response
    fmt.Fprintf(os.Stdout, "Response from `AdminApi.GetHealthCheck`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetHealthCheckRequest struct via the builder pattern


### Return type

[**GetHealthCheck200Response**](GetHealthCheck200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetSessionIds

> []string GetSessionIds(ctx).SessionsRequest(sessionsRequest).Execute()

Get SATP session ids



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
    sessionsRequest := map[string]interface{}{ ... } // map[string]interface{} |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AdminApi.GetSessionIds(context.Background()).SessionsRequest(sessionsRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AdminApi.GetSessionIds``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetSessionIds`: []string
    fmt.Fprintf(os.Stdout, "Response from `AdminApi.GetSessionIds`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetSessionIdsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **sessionsRequest** | [**map[string]interface{}**](map[string]interface{}.md) |  | 

### Return type

**[]string**

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


## PerformAudit

> PerformAudit200Response PerformAudit(ctx).StartTimestamp(startTimestamp).EndTimestamp(endTimestamp).Execute()

Audit transactions



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
    startTimestamp := int64(789) // int64 | The start timestamp for the audit period. (optional)
    endTimestamp := int64(789) // int64 | The end timestamp for the audit period. (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AdminApi.PerformAudit(context.Background()).StartTimestamp(startTimestamp).EndTimestamp(endTimestamp).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AdminApi.PerformAudit``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `PerformAudit`: PerformAudit200Response
    fmt.Fprintf(os.Stdout, "Response from `AdminApi.PerformAudit`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPerformAuditRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **startTimestamp** | **int64** | The start timestamp for the audit period. | 
 **endTimestamp** | **int64** | The end timestamp for the audit period. | 

### Return type

[**PerformAudit200Response**](PerformAudit200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

