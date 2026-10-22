# AdapterInboundWebhookConfig

Inbound webhook configuration for blocking approval workflows during SATP execution.  **Purpose:** Inbound webhooks enable external approval controllers, compliance systems, and human operators to participate in SATP cross-chain transfers. When configured, the gateway pauses protocol execution and waits for an external decision before proceeding.  **Execution Model:** - Blocking: SATP transfer waits for external controller response or timeout - Gateway exposes decision endpoint under API3 adapter base path - Multiple inbound webhooks at the same point serialize for clear approval semantics - Timeout triggers automatic rejection with configurable behavior  **Decision Flow:** 1. Gateway reaches configured execution point and pauses 2. External controller receives notification (via paired outbound webhook or polling) 3. Controller posts decision to `/api/v1/.../webhook/inbound/decide` 4. Gateway validates adapterId/sessionId and resumes or aborts based on `continue` field

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**timeoutMs** | **number** | Maximum time the gateway waits for external decision before timing out. | [optional] [default to 300000]
**payloadTemplate** | **string** | Optional payload template for context data. | [optional] [default to undefined]
**retryAttempts** | **number** | Maximum number of retry attempts. | [optional] [default to 3]
**retryDelayMs** | **number** | Backoff delay between attempts in milliseconds. | [optional] [default to 1000]
**priority** | **number** | Priority for ordering multiple inbound webhooks within the same adapter. Lower numbers execute first. Defaults to 1000 if not specified. | [optional] [default to 1000]

## Example

```typescript
import { AdapterInboundWebhookConfig } from './api';

const instance: AdapterInboundWebhookConfig = {
    timeoutMs,
    payloadTemplate,
    retryAttempts,
    retryDelayMs,
    priority,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
