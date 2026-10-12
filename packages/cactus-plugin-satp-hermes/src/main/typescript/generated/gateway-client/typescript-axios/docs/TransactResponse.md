# TransactResponse

Response schema for a transaction request. Includes the session ID and the current status of the transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sessionID** | **string** | Unique identifier (UUID) for the session. | [default to undefined]
**statusResponse** | [**Transact200ResponseStatusResponse**](Transact200ResponseStatusResponse.md) |  | [default to undefined]

## Example

```typescript
import { TransactResponse } from './api';

const instance: TransactResponse = {
    sessionID,
    statusResponse,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
