# SignTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**keychainId** | **string** |  | [default to undefined]
**keychainRef** | **string** |  | [default to undefined]
**transactionHash** | **string** | The transaction hash of ledger will be used to fetch the contain. | [default to undefined]

## Example

```typescript
import { SignTransactionRequest } from './api';

const instance: SignTransactionRequest = {
    keychainId,
    keychainRef,
    transactionHash,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
