# GasTransactionConfigLegacy

Transaction gas settings in networks before EIP-1559 (London fork).

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**gas** | **string** | A maximum amount of gas a user is willing to provide for the execution of the transaction. (gasLimit) | [optional] [default to undefined]
**gasPrice** | **string** | A price (in Wei) a user is willing to pay for each unit of gas used during the execution of the transaction. In EIP-1559 (London fork) networks, it will be set as both maxFeePerGas and maxPriorityFeePerGas. | [optional] [default to undefined]

## Example

```typescript
import { GasTransactionConfigLegacy } from './api';

const instance: GasTransactionConfigLegacy = {
    gas,
    gasPrice,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
