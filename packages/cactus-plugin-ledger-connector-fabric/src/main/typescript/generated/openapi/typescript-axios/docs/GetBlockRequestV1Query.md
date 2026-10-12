# GetBlockRequestV1Query

Query selector, caller must provide at least one of them. First found will be used, rest will be ignored, so it\'s recommended to pass single selector.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**blockNumber** | **string** | Select block by it\&#39;s number. | [optional] [default to undefined]
**blockHash** | [**GetBlockRequestV1QueryBlockHash**](GetBlockRequestV1QueryBlockHash.md) |  | [optional] [default to undefined]
**transactionId** | **string** | Select block by id of transaction that it contains. | [optional] [default to undefined]

## Example

```typescript
import { GetBlockRequestV1Query } from './api';

const instance: GetBlockRequestV1Query = {
    blockNumber,
    blockHash,
    transactionId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
