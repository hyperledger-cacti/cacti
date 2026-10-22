# WatchBlocksV1BlockData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**number** | **string** |  | [default to undefined]
**hash** | **string** |  | [optional] [default to undefined]
**parentHash** | **string** |  | [default to undefined]
**nonce** | **string** |  | [default to undefined]
**sha3Uncles** | **string** |  | [default to undefined]
**logsBloom** | **string** |  | [optional] [default to undefined]
**transactionsRoot** | **string** |  | [optional] [default to undefined]
**stateRoot** | **string** |  | [default to undefined]
**receiptsRoot** | **string** |  | [optional] [default to undefined]
**difficulty** | **string** |  | [optional] [default to undefined]
**mixHash** | **string** |  | [optional] [default to undefined]
**miner** | **string** |  | [default to undefined]
**extraData** | **string** |  | [default to undefined]
**gasLimit** | **string** |  | [default to undefined]
**gasUsed** | **string** |  | [default to undefined]
**timestamp** | [**WatchBlocksV1BlockDataTimestamp**](WatchBlocksV1BlockDataTimestamp.md) |  | [default to undefined]
**size** | **string** |  | [default to undefined]
**totalDifficulty** | **string** |  | [default to undefined]
**uncles** | **Array&lt;string&gt;** |  | [default to undefined]
**baseFeePerGas** | **string** |  | [optional] [default to undefined]
**transactions** | [**Array&lt;Web3Transaction&gt;**](Web3Transaction.md) |  | [default to undefined]

## Example

```typescript
import { WatchBlocksV1BlockData } from './api';

const instance: WatchBlocksV1BlockData = {
    number,
    hash,
    parentHash,
    nonce,
    sha3Uncles,
    logsBloom,
    transactionsRoot,
    stateRoot,
    receiptsRoot,
    difficulty,
    mixHash,
    miner,
    extraData,
    gasLimit,
    gasUsed,
    timestamp,
    size,
    totalDifficulty,
    uncles,
    baseFeePerGas,
    transactions,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
