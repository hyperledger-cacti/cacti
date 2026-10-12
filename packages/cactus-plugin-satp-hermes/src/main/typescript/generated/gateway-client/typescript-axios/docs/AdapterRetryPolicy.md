# AdapterRetryPolicy

Common retry policy applied to outbound/inbound webhook invocations.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**retryAttempts** | **number** | Maximum number of attempts (initial + retries). | [optional] [default to 3]
**retryDelayMs** | **number** | Backoff delay between attempts in milliseconds. | [optional] [default to 1000]

## Example

```typescript
import { AdapterRetryPolicy } from './api';

const instance: AdapterRetryPolicy = {
    retryAttempts,
    retryDelayMs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
