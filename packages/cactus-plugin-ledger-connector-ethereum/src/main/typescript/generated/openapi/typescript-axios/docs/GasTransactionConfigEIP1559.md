# GasTransactionConfigEIP1559

Transaction gas settings in networks after EIP-1559 (London fork).

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**gasLimit** | **string** | A maximum amount of gas a user is willing to provide for the execution of the transaction. | [optional] [default to undefined]
**maxFeePerGas** | **string** | A maximum fee (including the base fee and the tip) a user is willing to pay per unit of gas. | [optional] [default to undefined]
**maxPriorityFeePerGas** | **string** | A maximum tip amount a user is willing to pay per unit of gas. | [optional] [default to undefined]

## Example

```typescript
import { GasTransactionConfigEIP1559 } from './api';

const instance: GasTransactionConfigEIP1559 = {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
