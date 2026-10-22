# CancelResponse

Response for a cancel transaction request. Indicates whether the cancel action was successful and includes the current session status.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**statusResponse** | [**Transact200ResponseStatusResponse**](Transact200ResponseStatusResponse.md) |  | [default to undefined]
**cancelSuccessful** | **boolean** | Indicates whether the cancel operation was successful. | [default to undefined]

## Example

```typescript
import { CancelResponse } from './api';

const instance: CancelResponse = {
    statusResponse,
    cancelSuccessful,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
