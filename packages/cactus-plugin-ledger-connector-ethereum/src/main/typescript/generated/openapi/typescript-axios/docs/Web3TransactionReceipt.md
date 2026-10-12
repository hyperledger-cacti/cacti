# Web3TransactionReceipt


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **boolean** |  | [default to undefined]
**transactionHash** | **string** |  | [default to undefined]
**transactionIndex** | **string** |  | [default to undefined]
**blockHash** | **string** |  | [default to undefined]
**blockNumber** | **string** |  | [default to undefined]
**gasUsed** | **string** |  | [default to undefined]
**effectiveGasPrice** | **string** |  | [optional] [default to undefined]
**contractAddress** | **string** |  | [optional] [default to undefined]
**from** | **string** |  | [default to undefined]
**to** | **string** |  | [default to undefined]
**logs** | **Array&lt;any&gt;** |  | [optional] [default to undefined]
**logsBloom** | **string** |  | [optional] [default to undefined]
**revertReason** | **string** |  | [optional] [default to undefined]
**output** | **string** |  | [optional] [default to undefined]
**commitmentHash** | **string** |  | [optional] [default to undefined]
**cumulativeGasUsed** | **string** |  | [optional] [default to undefined]
**type** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { Web3TransactionReceipt } from './api';

const instance: Web3TransactionReceipt = {
    status,
    transactionHash,
    transactionIndex,
    blockHash,
    blockNumber,
    gasUsed,
    effectiveGasPrice,
    contractAddress,
    from,
    to,
    logs,
    logsBloom,
    revertReason,
    output,
    commitmentHash,
    cumulativeGasUsed,
    type,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
