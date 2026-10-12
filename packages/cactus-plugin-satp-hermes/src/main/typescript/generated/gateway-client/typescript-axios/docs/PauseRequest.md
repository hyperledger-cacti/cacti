# PauseRequest

Request to temporarily pause an ongoing transaction session, identified by the session and context IDs.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sessionId** | **string** |  | [optional] [default to undefined]
**contextId** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { PauseRequest } from './api';

const instance: PauseRequest = {
    sessionId,
    contextId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
