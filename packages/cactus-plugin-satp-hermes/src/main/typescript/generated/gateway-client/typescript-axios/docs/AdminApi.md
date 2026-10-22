# AdminApi

All URIs are relative to *http://localhost:3011*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**_continue**](#_continue) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/continue | Continue a paused transaction session|
|[**getHealthCheck**](#gethealthcheck) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck | Health check endpoint|
|[**getSessionIds**](#getsessionids) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/get-sessions-ids | Get SATP session ids|
|[**getSessionProofs**](#getsessionproofs) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/proofs | Get session proofs|
|[**getStatus**](#getstatus) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/status | Get SATP current session data|
|[**getSupportedLedgers**](#getsupportedledgers) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/supported-ledgers | Get supported ledgers|
|[**pause**](#pause) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/pause | Pause a transaction session|
|[**performAudit**](#performaudit) | **GET** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/audit | Audit transactions|

# **_continue**
> Continue200Response _continue(continueRequest)

Attempts to continue a previously paused transaction intent, resuming its execution.

### Example

```typescript
import {
    AdminApi,
    Configuration,
    ContinueRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let continueRequest: ContinueRequest; //Continue request object.

const { status, data } = await apiInstance._continue(
    continueRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **continueRequest** | **ContinueRequest**| Continue request object. | |


### Return type

**Continue200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Transaction continuation attempted |  -  |
|**0** | An error occurred or transaction cannot be continued |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHealthCheck**
> GetHealthCheck200Response getHealthCheck()

Responds if SATP Hermes is on

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

const { status, data } = await apiInstance.getHealthCheck();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**GetHealthCheck200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSessionIds**
> Array<string> getSessionIds()

Retrieve the all SATP session IDs

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let sessionsRequest: object; //Request object for fetching session IDs. (optional) (default to undefined)

const { status, data } = await apiInstance.getSessionIds(
    sessionsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sessionsRequest** | **object** | Request object for fetching session IDs. | (optional) defaults to undefined|


### Return type

**Array<string>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad request |  -  |
|**404** | Transaction not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSessionProofs**
> GetSessionProofs200Response getSessionProofs()

Retrieves the signature-verified SessionProofs (claims recorded at each SATP protocol step) persisted in the audit database for the given session IDs. 

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let sessionIds: string; //Comma-separated list of SATP session IDs to retrieve proofs for. (default to undefined)

const { status, data } = await apiInstance.getSessionProofs(
    sessionIds
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sessionIds** | [**string**] | Comma-separated list of SATP session IDs to retrieve proofs for. | defaults to undefined|


### Return type

**GetSessionProofs200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Session proofs for the requested sessions |  -  |
|**0** | An error occurred |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getStatus**
> Transact200ResponseStatusResponse getStatus()

Retrieve the status of a SATP session

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let sessionID: string; //Unique identifier for the session. (default to undefined)

const { status, data } = await apiInstance.getStatus(
    sessionID
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sessionID** | [**string**] | Unique identifier for the session. | defaults to undefined|


### Return type

**Transact200ResponseStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad request |  -  |
|**404** | Transaction not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSupportedLedgers**
> GetSupportedLedgers200Response getSupportedLedgers()

Returns the list of ledger types supported by this gateway, computed as the intersection of operator-configured supported ledgers and the hardcoded set of implemented ledger types.

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

const { status, data } = await apiInstance.getSupportedLedgers();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**GetSupportedLedgers200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of supported ledger types. |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pause**
> Pause200Response pause(pauseRequest)

Attempts to pause a previously submitted transaction intent, temporarily halting its execution.

### Example

```typescript
import {
    AdminApi,
    Configuration,
    PauseRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let pauseRequest: PauseRequest; //Pause request object.

const { status, data } = await apiInstance.pause(
    pauseRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pauseRequest** | **PauseRequest**| Pause request object. | |


### Return type

**Pause200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Transaction pause attempted |  -  |
|**0** | An error occurred or transaction cannot be paused |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **performAudit**
> PerformAudit200Response performAudit()

Audits transactions based on provided filters such as start and end dates. Optionally includes proofs generated from each gateway transaction.

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let startTimestamp: string; //The start timestamp for the audit period. (default to undefined)
let endTimestamp: string; //The end timestamp for the audit period (defaults to now if omitted). (optional) (default to undefined)

const { status, data } = await apiInstance.performAudit(
    startTimestamp,
    endTimestamp
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **startTimestamp** | [**string**] | The start timestamp for the audit period. | defaults to undefined|
| **endTimestamp** | [**string**] | The end timestamp for the audit period (defaults to now if omitted). | (optional) defaults to undefined|


### Return type

**PerformAudit200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Audit results |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

