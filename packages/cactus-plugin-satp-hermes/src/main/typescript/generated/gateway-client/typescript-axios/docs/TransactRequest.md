# TransactRequest

Request schema for initiating a transaction. Includes details such as the transaction context, mode (data or transfer), payload, and information about the source and destination DLT networks.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contextID** | **string** | The unique identifier of the task. | [default to undefined]
**payload** | **string** |  | [optional] [default to undefined]
**sourceAsset** | [**TransactRequestSourceAsset**](TransactRequestSourceAsset.md) |  | [default to undefined]
**receiverAsset** | [**TransactRequestSourceAsset**](TransactRequestSourceAsset.md) |  | [default to undefined]

## Example

```typescript
import { TransactRequest } from './api';

const instance: TransactRequest = {
    contextID,
    payload,
    sourceAsset,
    receiverAsset,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
