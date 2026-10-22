# RegisterOracleTaskRequestDestinationContract

The contract address on the destination blockchain. Only if taskType is UPDATE or READ_AND_UPDATE.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractName** | **string** | The name of the contract. | [optional] [default to undefined]
**contractAddress** | **string** | The address of the contract. | [optional] [default to undefined]
**contractAbi** | **Array&lt;object&gt;** | The ABI (Application Binary Interface) of the contract. | [optional] [default to undefined]
**contractBytecode** | **string** | The bytecode of the contract. | [optional] [default to undefined]
**methodName** | **string** | The name of the method to be invoked on the contract. | [optional] [default to undefined]
**params** | [**Array&lt;ExecuteOracleTaskRequestSourceContractParamsInner&gt;**](ExecuteOracleTaskRequestSourceContractParamsInner.md) | The parameters to be passed to the contract method. | [optional] [default to undefined]

## Example

```typescript
import { RegisterOracleTaskRequestDestinationContract } from './api';

const instance: RegisterOracleTaskRequestDestinationContract = {
    contractName,
    contractAddress,
    contractAbi,
    contractBytecode,
    methodName,
    params,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
