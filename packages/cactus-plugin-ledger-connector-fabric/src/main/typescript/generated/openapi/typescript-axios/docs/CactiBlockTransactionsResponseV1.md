# CactiBlockTransactionsResponseV1

Custom response containing block transactions summary. Compatible with legacy fabric-socketio connector monitoring.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cactiTransactionsEvents** | [**Array&lt;CactiBlockTransactionEventV1&gt;**](CactiBlockTransactionEventV1.md) | List of transactions summary | [default to undefined]

## Example

```typescript
import { CactiBlockTransactionsResponseV1 } from './api';

const instance: CactiBlockTransactionsResponseV1 = {
    cactiTransactionsEvents,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
