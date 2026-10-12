# DeployContractV1Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractId** | **string** | The ID of the contract that was deployed. | [default to undefined]
**wasmHash** | **string** | The hash of the wasm code installed in the ledger. | [default to undefined]

## Example

```typescript
import { DeployContractV1Response } from './api';

const instance: DeployContractV1Response = {
    contractId,
    wasmHash,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
