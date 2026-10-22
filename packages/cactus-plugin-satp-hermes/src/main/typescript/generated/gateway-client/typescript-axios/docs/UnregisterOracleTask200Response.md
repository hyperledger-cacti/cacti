# UnregisterOracleTask200Response

Response schema for unregistering a data transfer task. Includes the task ID and status of the unregistration.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**taskID** | **string** | Unique identifier (UUID) for the session. | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { UnregisterOracleTask200Response } from './api';

const instance: UnregisterOracleTask200Response = {
    taskID,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
