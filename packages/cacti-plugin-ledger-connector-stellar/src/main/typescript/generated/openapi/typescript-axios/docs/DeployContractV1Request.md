# DeployContractV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**wasmHash** | **string** | The hash of the wasm code installed in the ledger to be deployed into a new instance. | [optional] [default to undefined]
**wasmBuffer** | **string** | A Base64-encoded string that contains the binary data of the WASM code. This buffer is used to deploy WebAssembly code to the ledger. | [optional] [default to undefined]
**transactionInvocation** | [**TransactionInvocation**](TransactionInvocation.md) |  | [default to undefined]

## Example

```typescript
import { DeployContractV1Request } from './api';

const instance: DeployContractV1Request = {
    wasmHash,
    wasmBuffer,
    transactionInvocation,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
