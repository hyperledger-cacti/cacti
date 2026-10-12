# GetTransactionReceiptResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**blockNumber** | **string** |  | [optional] [default to undefined]
**channelID** | **string** |  | [optional] [default to undefined]
**transactionCreator** | [**TransactReceiptTransactionCreator**](TransactReceiptTransactionCreator.md) |  | [optional] [default to undefined]
**transactionEndorsement** | [**Array&lt;TransactReceiptTransactionEndorsement&gt;**](TransactReceiptTransactionEndorsement.md) |  | [optional] [default to undefined]
**blockMetaData** | [**TransactReceiptBlockMetaData**](TransactReceiptBlockMetaData.md) |  | [optional] [default to undefined]
**chainCodeName** | **string** |  | [optional] [default to undefined]
**chainCodeVersion** | **string** |  | [optional] [default to undefined]
**responseStatus** | **string** |  | [optional] [default to undefined]
**rwsetKey** | **string** |  | [optional] [default to undefined]
**rwsetWriteData** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { GetTransactionReceiptResponse } from './api';

const instance: GetTransactionReceiptResponse = {
    blockNumber,
    channelID,
    transactionCreator,
    transactionEndorsement,
    blockMetaData,
    chainCodeName,
    chainCodeVersion,
    responseStatus,
    rwsetKey,
    rwsetWriteData,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
