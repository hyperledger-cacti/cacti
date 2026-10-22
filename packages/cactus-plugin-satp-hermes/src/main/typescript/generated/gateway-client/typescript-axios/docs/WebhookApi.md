# WebhookApi

All URIs are relative to *http://localhost:3011*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**decideInboundWebhook**](#decideinboundwebhook) | **POST** /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/webhook/inbound/decide | Submit inbound webhook decision|

# **decideInboundWebhook**
> DecideInboundWebhook200Response decideInboundWebhook(decideInboundWebhookRequest)

External approval controllers use this endpoint to submit decisions (approve/reject) for paused SATP transfers. When an adapter with an inbound webhook executes, the  gateway pauses and waits for an external decision via this endpoint.  **Inbound Webhook Workflow:** 1. SATP gateway reaches a stage/step with configured inbound adapter 2. Gateway pauses execution and waits for external decision POST 3. External controller evaluates business rules, compliance checks, or manual review 4. Controller POSTs decision payload to this endpoint 5. Gateway validates decision, logs justification, and resumes or aborts transfer  **Decision Semantics:** - `continue: true` - Approve transfer continuation; gateway proceeds to next stage - `continue: false` - Reject transfer; gateway aborts and may trigger rollback - `reason` - Human-readable justification stored in audit logs  **Timeout Handling:** Each inbound webhook declares a `timeoutMs` timeout. If no decision arrives within this window, the gateway treats it as a rejection and aborts the transfer.  **Security Considerations:** - Inbound endpoints should use authentication (API keys, mTLS, JWT validation) - Decision payloads must include adapter ID to match the paused session state - All decisions are logged with timestamps for non-repudiation

### Example

```typescript
import {
    WebhookApi,
    Configuration,
    DecideInboundWebhookRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new WebhookApi(configuration);

let decideInboundWebhookRequest: DecideInboundWebhookRequest; //

const { status, data } = await apiInstance.decideInboundWebhook(
    decideInboundWebhookRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **decideInboundWebhookRequest** | **DecideInboundWebhookRequest**|  | |


### Return type

**DecideInboundWebhook200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Decision accepted and applied to the session |  -  |
|**400** | Bad request - invalid decision payload |  -  |
|**404** | Session or adapter not found, or no pending decision |  -  |
|**409** | Decision conflict - session not in waiting state |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

