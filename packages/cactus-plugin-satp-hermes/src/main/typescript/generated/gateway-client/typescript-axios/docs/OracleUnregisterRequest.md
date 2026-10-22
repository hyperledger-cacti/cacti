# OracleUnregisterRequest

Request schema for unregistering a data transfer task. Includes the context ID of the task to be unregistered.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**taskID** | **string** | Unique identifier (UUID) for the session. | [default to undefined]

## Example

```typescript
import { OracleUnregisterRequest } from './api';

const instance: OracleUnregisterRequest = {
    taskID,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
