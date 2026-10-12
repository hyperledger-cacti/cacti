# GetBlockResponseV1

Response from GetBlock endpoint.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cactiTransactionsEvents** | [**Array&lt;CactiBlockTransactionEventV1&gt;**](CactiBlockTransactionEventV1.md) | List of transactions summary | [default to undefined]
**cactiFullEvents** | [**CactiBlockFullEventV1**](CactiBlockFullEventV1.md) |  | [default to undefined]
**decodedBlock** | **any** | Full hyperledger fabric block data. | [default to undefined]
**encodedBlock** | **string** |  | [default to undefined]

## Example

```typescript
import { GetBlockResponseV1 } from './api';

const instance: GetBlockResponseV1 = {
    cactiTransactionsEvents,
    cactiFullEvents,
    decodedBlock,
    encodedBlock,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
