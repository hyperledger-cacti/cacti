# OracleUnregisterResponse

Response schema for unregistering a data transfer task. Includes the task ID and status of the unregistration.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**taskID** | **string** | Unique identifier (UUID) for the session. | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { OracleUnregisterResponse } from './api';

const instance: OracleUnregisterResponse = {
    taskID,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
