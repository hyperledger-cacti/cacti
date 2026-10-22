# AdapterDefinitionOutboundWebhook

Outbound webhook configuration for notifying external systems about SATP protocol events.  **Purpose:** Outbound webhooks enable fire-and-forget notifications to external monitoring, logging, metrics collection, and audit systems. When SATP lifecycle events occur, the gateway POSTs a standardized JSON payload to the configured URL.  **Execution Model:** - Non-blocking: SATP execution continues regardless of webhook response - Supports retry logic with exponential backoff for reliability - Multiple outbound webhooks at the same execution point run concurrently - Always uses POST method with application/json content-type

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**url** | **string** | Absolute HTTPS endpoint the gateway should call. | [default to undefined]
**timeoutMs** | **number** | Maximum time the gateway waits for the remote endpoint before aborting. | [optional] [default to 5000]
**payloadTemplate** | **string** | Optional payload template rendered per invocation. | [optional] [default to undefined]
**retryAttempts** | **number** | Maximum number of retry attempts. | [optional] [default to 3]
**retryDelayMs** | **number** | Backoff delay between attempts in milliseconds. | [optional] [default to 1000]
**priority** | **number** | Priority for ordering multiple outbound webhooks within the same adapter. Lower numbers execute first. Defaults to 1000 if not specified. | [optional] [default to 1000]

## Example

```typescript
import { AdapterDefinitionOutboundWebhook } from './api';

const instance: AdapterDefinitionOutboundWebhook = {
    url,
    timeoutMs,
    payloadTemplate,
    retryAttempts,
    retryDelayMs,
    priority,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
