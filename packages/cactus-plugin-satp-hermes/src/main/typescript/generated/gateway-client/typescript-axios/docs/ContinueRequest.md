# ContinueRequest

Schema for a request to continue a paused transaction session.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sessionId** | **string** | A unique identifier for the transaction session to be continued. | [default to undefined]
**contextId** | **string** | A unique identifier for the transaction context. | [default to undefined]

## Example

```typescript
import { ContinueRequest } from './api';

const instance: ContinueRequest = {
    sessionId,
    contextId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
