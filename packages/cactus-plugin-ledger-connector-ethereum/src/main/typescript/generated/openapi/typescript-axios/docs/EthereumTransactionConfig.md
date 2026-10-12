# EthereumTransactionConfig


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**rawTransaction** | **string** |  | [optional] [default to undefined]
**from** | **string** |  | [optional] [default to undefined]
**to** | **string** |  | [optional] [default to undefined]
**value** | **string** |  | [optional] [default to undefined]
**nonce** | **string** |  | [optional] [default to undefined]
**data** | **string** |  | [optional] [default to undefined]
**gasConfig** | [**GasTransactionConfig**](GasTransactionConfig.md) |  | [optional] [default to undefined]

## Example

```typescript
import { EthereumTransactionConfig } from './api';

const instance: EthereumTransactionConfig = {
    rawTransaction,
    from,
    to,
    value,
    nonce,
    data,
    gasConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
