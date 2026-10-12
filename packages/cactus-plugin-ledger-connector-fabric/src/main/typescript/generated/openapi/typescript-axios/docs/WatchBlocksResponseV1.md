# WatchBlocksResponseV1

Response block from WatchBlocks endpoint. Depends on \'type\' passed in subscription options.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cactiTransactionsEvents** | [**Array&lt;CactiBlockTransactionEventV1&gt;**](CactiBlockTransactionEventV1.md) | List of transactions summary | [default to undefined]
**cactiFullEvents** | [**CactiBlockFullEventV1**](CactiBlockFullEventV1.md) |  | [default to undefined]
**fullBlock** | **any** | Full commited block. | [default to undefined]
**filteredBlock** | **any** | Filtered commited block. | [default to undefined]
**privateBlock** | **any** | Private commited block. | [default to undefined]
**code** | **number** | Error code. | [default to undefined]
**errorMessage** | **string** | Description of the error. | [default to undefined]

## Example

```typescript
import { WatchBlocksResponseV1 } from './api';

const instance: WatchBlocksResponseV1 = {
    cactiTransactionsEvents,
    cactiFullEvents,
    fullBlock,
    filteredBlock,
    privateBlock,
    code,
    errorMessage,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
