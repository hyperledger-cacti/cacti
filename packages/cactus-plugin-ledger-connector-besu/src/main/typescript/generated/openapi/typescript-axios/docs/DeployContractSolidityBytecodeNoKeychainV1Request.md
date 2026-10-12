# DeployContractSolidityBytecodeNoKeychainV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractName** | **string** | The contract name for retrieve the contracts json on the keychain. | [default to undefined]
**contractAbi** | **Array&lt;any&gt;** | The application binary interface of the solidity contract | [default to undefined]
**constructorArgs** | **Array&lt;any&gt;** |  | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**bytecode** | **string** | See https://ethereum.stackexchange.com/a/47556 regarding the maximum length of the bytecode. 2 + (24576 * 2) &#x3D; 49154 meaning that hex stores each byte in 2 characters and that there is a 0x prefix (2 characters) which does not count towards the EVM 24576 bytecode limit. | [default to undefined]
**gas** | **number** |  | [optional] [default to undefined]
**gasPrice** | **string** |  | [optional] [default to undefined]
**timeoutMs** | **number** | The amount of milliseconds to wait for a transaction receipt with theaddress of the contract(which indicates successful deployment) beforegiving up and crashing. | [optional] [default to 60000]
**privateTransactionConfig** | [**BesuPrivateTransactionConfig**](BesuPrivateTransactionConfig.md) |  | [optional] [default to undefined]

## Example

```typescript
import { DeployContractSolidityBytecodeNoKeychainV1Request } from './api';

const instance: DeployContractSolidityBytecodeNoKeychainV1Request = {
    contractName,
    contractAbi,
    constructorArgs,
    web3SigningCredential,
    bytecode,
    gas,
    gasPrice,
    timeoutMs,
    privateTransactionConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
