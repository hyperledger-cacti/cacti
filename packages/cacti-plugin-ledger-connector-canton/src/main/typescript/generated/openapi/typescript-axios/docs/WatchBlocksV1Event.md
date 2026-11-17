# WatchBlocksV1Event

Exactly one of `created` and `archived` is set.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**created** | [**ActiveContract**](ActiveContract.md) |  | [optional] [default to undefined]
**archived** | [**WatchBlocksV1ArchivedContract**](WatchBlocksV1ArchivedContract.md) |  | [optional] [default to undefined]

## Example

```typescript
import { WatchBlocksV1Event } from './api';

const instance: WatchBlocksV1Event = {
    created,
    archived,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
