# GetChainInfoResponseV1

Response from GetChainInfo endpoint.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**height** | **number** | Current height of fabric ledger | [default to undefined]
**currentBlockHash** | **string** | Current block hash of fabric ledger | [default to undefined]
**previousBlockHash** | **string** | Previous block hash of fabric ledger | [default to undefined]

## Example

```typescript
import { GetChainInfoResponseV1 } from './api';

const instance: GetChainInfoResponseV1 = {
    height,
    currentBlockHash,
    previousBlockHash,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
