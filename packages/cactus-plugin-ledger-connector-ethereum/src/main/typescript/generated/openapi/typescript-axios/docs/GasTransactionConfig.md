# GasTransactionConfig

Transaction gas settings.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**gas** | **string** | A maximum amount of gas a user is willing to provide for the execution of the transaction. (gasLimit) | [optional] [default to undefined]
**gasPrice** | **string** | A price (in Wei) a user is willing to pay for each unit of gas used during the execution of the transaction. In EIP-1559 (London fork) networks, it will be set as both maxFeePerGas and maxPriorityFeePerGas. | [optional] [default to undefined]
**gasLimit** | **string** | A maximum amount of gas a user is willing to provide for the execution of the transaction. | [optional] [default to undefined]
**maxFeePerGas** | **string** | A maximum fee (including the base fee and the tip) a user is willing to pay per unit of gas. | [optional] [default to undefined]
**maxPriorityFeePerGas** | **string** | A maximum tip amount a user is willing to pay per unit of gas. | [optional] [default to undefined]

## Example

```typescript
import { GasTransactionConfig } from './api';

const instance: GasTransactionConfig = {
    gas,
    gasPrice,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
