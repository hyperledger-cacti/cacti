# InvokeContractV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractName** | **string** |  | [default to undefined]
**signingCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**invocationType** | [**EthContractInvocationType**](EthContractInvocationType.md) |  | [default to undefined]
**methodName** | **string** | The name of the contract method to invoke. | [default to undefined]
**params** | **Array&lt;any&gt;** | The list of arguments to pass in to the contract method being invoked. | [default to undefined]
**contractAbi** | **Array&lt;any&gt;** | The application binary interface of the solidity contract, optional parameter | [optional] [default to undefined]
**contractAddress** | **string** | Address of the solidity contract, optional parameter | [optional] [default to undefined]
**value** | [**Web3BlockHeaderTimestamp**](Web3BlockHeaderTimestamp.md) |  | [optional] [default to undefined]
**gas** | [**Web3BlockHeaderTimestamp**](Web3BlockHeaderTimestamp.md) |  | [optional] [default to undefined]
**gasPrice** | [**Web3BlockHeaderTimestamp**](Web3BlockHeaderTimestamp.md) |  | [optional] [default to undefined]
**nonce** | **number** |  | [optional] [default to undefined]
**timeoutMs** | **number** | The amount of milliseconds to wait for a transaction receipt beforegiving up and crashing. Only has any effect if the invocation type is SEND | [optional] [default to 60000]
**keychainId** | **string** | The keychainId for retrieve the contracts json. | [optional] [default to undefined]
**privateTransactionConfig** | [**BesuPrivateTransactionConfig**](BesuPrivateTransactionConfig.md) |  | [optional] [default to undefined]

## Example

```typescript
import { InvokeContractV1Request } from './api';

const instance: InvokeContractV1Request = {
    contractName,
    signingCredential,
    invocationType,
    methodName,
    params,
    contractAbi,
    contractAddress,
    value,
    gas,
    gasPrice,
    nonce,
    timeoutMs,
    keychainId,
    privateTransactionConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
