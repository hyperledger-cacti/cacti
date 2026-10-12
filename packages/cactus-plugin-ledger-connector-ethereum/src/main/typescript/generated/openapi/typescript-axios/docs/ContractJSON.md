# ContractJSON


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractName** | **string** |  | [default to undefined]
**bytecode** | **string** | See https://ethereum.stackexchange.com/a/47556 regarding the maximum length of the bytecode | [default to undefined]
**abi** | **Array&lt;any&gt;** | The application binary interface of the solidity contract, optional parameter | [default to undefined]
**metadata** | **string** |  | [optional] [default to undefined]
**deployedBytecode** | **string** |  | [optional] [default to undefined]
**sourceMap** | **string** |  | [optional] [default to undefined]
**deployedSourceMap** | **string** |  | [optional] [default to undefined]
**sourcePath** | **string** |  | [optional] [default to undefined]
**compiler** | **object** |  | [optional] [default to undefined]
**networks** | **object** |  | [optional] [default to undefined]
**ast** | **object** |  | [optional] [default to undefined]
**functionHashes** | **object** |  | [optional] [default to undefined]
**gasEstimates** | **object** |  | [optional] [default to undefined]

## Example

```typescript
import { ContractJSON } from './api';

const instance: ContractJSON = {
    contractName,
    bytecode,
    abi,
    metadata,
    deployedBytecode,
    sourceMap,
    deployedSourceMap,
    sourcePath,
    compiler,
    networks,
    ast,
    functionHashes,
    gasEstimates,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
