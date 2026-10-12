# CactiBlockFullEventV1

Custom format full fabric block with transactions

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**blockNumber** | **number** |  | [default to undefined]
**blockHash** | **string** |  | [default to undefined]
**previousBlockHash** | **string** |  | [default to undefined]
**transactionCount** | **number** |  | [default to undefined]
**cactiTransactionsEvents** | [**Array&lt;FullBlockTransactionEventV1&gt;**](FullBlockTransactionEventV1.md) |  | [default to undefined]

## Example

```typescript
import { CactiBlockFullEventV1 } from './api';

const instance: CactiBlockFullEventV1 = {
    blockNumber,
    blockHash,
    previousBlockHash,
    transactionCount,
    cactiTransactionsEvents,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
