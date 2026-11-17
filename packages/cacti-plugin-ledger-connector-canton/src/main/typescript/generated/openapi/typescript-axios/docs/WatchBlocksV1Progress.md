# WatchBlocksV1Progress

One ledger transaction visible to the subscribed parties.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**offset** | **number** | Ledger offset of the transaction. Pass it as &#x60;lastSeenOffset&#x60; to resume after it. | [default to undefined]
**updateId** | **string** |  | [default to undefined]
**commandId** | **string** | Set only for transactions submitted by the connector\&#39;s Canton user. | [optional] [default to undefined]
**workflowId** | **string** |  | [optional] [default to undefined]
**effectiveAt** | **string** |  | [default to undefined]
**synchronizerId** | **string** |  | [default to undefined]
**events** | [**Array&lt;WatchBlocksV1Event&gt;**](WatchBlocksV1Event.md) |  | [default to undefined]

## Example

```typescript
import { WatchBlocksV1Progress } from './api';

const instance: WatchBlocksV1Progress = {
    offset,
    updateId,
    commandId,
    workflowId,
    effectiveAt,
    synchronizerId,
    events,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
