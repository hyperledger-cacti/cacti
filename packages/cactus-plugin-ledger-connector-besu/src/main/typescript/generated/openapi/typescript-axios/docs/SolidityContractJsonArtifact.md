# SolidityContractJsonArtifact


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractName** | **string** |  | [default to undefined]
**metadata** | **string** |  | [optional] [default to undefined]
**bytecode** | **string** |  | [optional] [default to undefined]
**deployedBytecode** | **string** |  | [optional] [default to undefined]
**sourceMap** | **string** |  | [optional] [default to undefined]
**deployedSourceMap** | **string** |  | [optional] [default to undefined]
**sourcePath** | **string** |  | [optional] [default to undefined]
**compiler** | [**SolidityContractJsonArtifactCompiler**](SolidityContractJsonArtifactCompiler.md) |  | [optional] [default to undefined]
**functionHashes** | **{ [key: string]: any; }** |  | [optional] [default to undefined]
**gasEstimates** | [**SolidityContractJsonArtifactGasEstimates**](SolidityContractJsonArtifactGasEstimates.md) |  | [optional] [default to undefined]

## Example

```typescript
import { SolidityContractJsonArtifact } from './api';

const instance: SolidityContractJsonArtifact = {
    contractName,
    metadata,
    bytecode,
    deployedBytecode,
    sourceMap,
    deployedSourceMap,
    sourcePath,
    compiler,
    functionHashes,
    gasEstimates,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
