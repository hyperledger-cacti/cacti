# AdapterLayerConfigurationGlobal

Global defaults for adapter execution. Applied to every adapter unless overridden at the adapter level.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**timeoutMs** | **number** | Default timeout in milliseconds. | [optional] [default to 5000]
**retryAttempts** | **number** | Default number of retry attempts. | [optional] [default to 3]
**retryDelayMs** | **number** | Default backoff delay in milliseconds. | [optional] [default to 1000]
**logLevel** | **string** | Logging level for adapter operations. | [optional] [default to LogLevelEnum_Info]
**headers** | **{ [key: string]: string; }** | Default HTTP headers to include in webhook requests. | [optional] [default to undefined]

## Example

```typescript
import { AdapterLayerConfigurationGlobal } from './api';

const instance: AdapterLayerConfigurationGlobal = {
    timeoutMs,
    retryAttempts,
    retryDelayMs,
    logLevel,
    headers,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
