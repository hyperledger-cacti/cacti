# InvokeContractV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contract** | [**InvokeContractV1RequestContract**](InvokeContractV1RequestContract.md) |  | [default to undefined]
**methodName** | **string** | The name of the contract method to invoke. | [default to undefined]
**params** | **Array&lt;any&gt;** | The list of arguments to pass in to the contract method being invoked. | [default to undefined]
**invocationType** | [**EthContractInvocationType**](EthContractInvocationType.md) |  | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [optional] [default to undefined]
**gasConfig** | [**GasTransactionConfig**](GasTransactionConfig.md) |  | [optional] [default to undefined]
**value** | **string** |  | [optional] [default to undefined]
**timeoutMs** | **number** | The amount of milliseconds to wait for a transaction receipt before returning an error. Only has any effect if the invocation type is SEND | [optional] [default to 60000]

## Example

```typescript
import { InvokeContractV1Request } from './api';

const instance: InvokeContractV1Request = {
    contract,
    methodName,
    params,
    invocationType,
    web3SigningCredential,
    gasConfig,
    value,
    timeoutMs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
