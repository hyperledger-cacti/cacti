# DeployContractV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**contract** | [**DeployContractV1RequestContract**](DeployContractV1RequestContract.md) |  | [default to undefined]
**constructorArgs** | **Array&lt;any&gt;** | The list of arguments to pass in to the constructor of the contract being deployed. | [optional] [default to undefined]
**gasConfig** | [**GasTransactionConfig**](GasTransactionConfig.md) |  | [optional] [default to undefined]
**value** | **string** | Ether balance to send on deployment. | [optional] [default to undefined]

## Example

```typescript
import { DeployContractV1Request } from './api';

const instance: DeployContractV1Request = {
    web3SigningCredential,
    contract,
    constructorArgs,
    gasConfig,
    value,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
