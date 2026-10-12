# WatchBlocksOptionsV1

Options passed when subscribing to block monitoring.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channelName** | **string** | Hyperledger Fabric channel to connect to. | [default to undefined]
**gatewayOptions** | [**GatewayOptions**](GatewayOptions.md) |  | [default to undefined]
**type** | [**WatchBlocksListenerTypeV1**](WatchBlocksListenerTypeV1.md) |  | [default to undefined]
**startBlock** | **string** | From which block start monitoring. Defaults to latest. | [optional] [default to undefined]

## Example

```typescript
import { WatchBlocksOptionsV1 } from './api';

const instance: WatchBlocksOptionsV1 = {
    channelName,
    gatewayOptions,
    type,
    startBlock,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
