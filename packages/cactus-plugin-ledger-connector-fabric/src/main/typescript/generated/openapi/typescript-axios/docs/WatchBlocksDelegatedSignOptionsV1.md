# WatchBlocksDelegatedSignOptionsV1

Options passed when subscribing to block monitoring with delegated signing.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | [**WatchBlocksListenerTypeV1**](WatchBlocksListenerTypeV1.md) |  | [default to undefined]
**startBlock** | **string** | From which block start monitoring. Defaults to latest. | [optional] [default to undefined]
**channelName** | **string** |  | [default to undefined]
**signerCertificate** | **string** |  | [default to undefined]
**signerMspID** | **string** |  | [default to undefined]
**uniqueTransactionData** | **any** | Can be used to uniquely identify and authorize signing request | [optional] [default to undefined]

## Example

```typescript
import { WatchBlocksDelegatedSignOptionsV1 } from './api';

const instance: WatchBlocksDelegatedSignOptionsV1 = {
    type,
    startBlock,
    channelName,
    signerCertificate,
    signerMspID,
    uniqueTransactionData,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
