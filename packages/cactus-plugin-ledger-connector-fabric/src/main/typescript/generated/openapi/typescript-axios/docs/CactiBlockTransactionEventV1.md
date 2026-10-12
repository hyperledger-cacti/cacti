# CactiBlockTransactionEventV1

Transaction summary from commited block.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**chaincodeId** | **string** | ChainCode containing function that was executed. | [default to undefined]
**transactionId** | **string** | Transaction identifier. | [default to undefined]
**functionName** | **string** | Function name that was executed. | [default to undefined]
**functionArgs** | **Array&lt;string&gt;** | List of function arguments. | [default to undefined]

## Example

```typescript
import { CactiBlockTransactionEventV1 } from './api';

const instance: CactiBlockTransactionEventV1 = {
    chaincodeId,
    transactionId,
    functionName,
    functionArgs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
