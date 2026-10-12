# AdapterBaseWebhookConfig

Common HTTP attributes shared by adapter webhook definitions.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**timeoutMs** | **number** | Maximum time the gateway waits for the remote endpoint before aborting. | [optional] [default to 5000]
**payloadTemplate** | **string** | Optional Mustache/Handlebars-style payload template rendered per invocation. | [optional] [default to undefined]
**retryAttempts** | **number** | Maximum number of attempts (initial + retries). | [optional] [default to 3]
**retryDelayMs** | **number** | Backoff delay between attempts in milliseconds. | [optional] [default to 1000]

## Example

```typescript
import { AdapterBaseWebhookConfig } from './api';

const instance: AdapterBaseWebhookConfig = {
    timeoutMs,
    payloadTemplate,
    retryAttempts,
    retryDelayMs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
