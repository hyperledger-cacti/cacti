# FullBlockTransactionEventV1

Transaction returned from fabric block.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**hash** | **string** |  | [default to undefined]
**channelId** | **string** |  | [default to undefined]
**timestamp** | **string** |  | [default to undefined]
**protocolVersion** | **number** |  | [default to undefined]
**transactionType** | **string** |  | [default to undefined]
**epoch** | **number** |  | [default to undefined]
**actions** | [**Array&lt;FullBlockTransactionActionV1&gt;**](FullBlockTransactionActionV1.md) |  | [default to undefined]

## Example

```typescript
import { FullBlockTransactionEventV1 } from './api';

const instance: FullBlockTransactionEventV1 = {
    hash,
    channelId,
    timestamp,
    protocolVersion,
    transactionType,
    epoch,
    actions,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
