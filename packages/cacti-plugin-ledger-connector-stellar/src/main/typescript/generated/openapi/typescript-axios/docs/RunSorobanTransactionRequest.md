# RunSorobanTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractId** | **string** | The ID of the contract that was deployed. | [default to undefined]
**specXdr** | **Array&lt;string&gt;** | Array of strings containing the XDR of the contract specification. | [default to undefined]
**method** | **string** | The method to be called on the contract. | [default to undefined]
**methodArgs** | **object** | The arguments to pass to the method. | [optional] [default to undefined]
**transactionInvocation** | [**TransactionInvocation**](TransactionInvocation.md) |  | [default to undefined]
**readOnly** | **boolean** | Flag indicating if the transaction should be read-only. | [default to undefined]

## Example

```typescript
import { RunSorobanTransactionRequest } from './api';

const instance: RunSorobanTransactionRequest = {
    contractId,
    specXdr,
    method,
    methodArgs,
    transactionInvocation,
    readOnly,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
