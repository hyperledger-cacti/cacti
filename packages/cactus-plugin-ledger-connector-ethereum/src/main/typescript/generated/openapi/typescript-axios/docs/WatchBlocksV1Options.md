# WatchBlocksV1Options


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**getBlockData** | **boolean** | Include entire block data if flag is true, otherwise just a header is returned (default) | [optional] [default to false]
**lastSeenBlock** | **number** | Block from which we want to start the monitoring process. | [optional] [default to undefined]
**httpPollInterval** | **number** | How often to poll ethereum node for new blocks. Not used if the node supports subscription based monitoring (i.e. WebSocket). | [optional] [default to undefined]

## Example

```typescript
import { WatchBlocksV1Options } from './api';

const instance: WatchBlocksV1Options = {
    getBlockData,
    lastSeenBlock,
    httpPollInterval,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
