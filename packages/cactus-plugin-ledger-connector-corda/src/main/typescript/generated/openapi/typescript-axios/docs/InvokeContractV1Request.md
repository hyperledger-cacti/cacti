# InvokeContractV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**flowFullClassName** | **string** | The fully qualified name of the Corda flow to invoke | [default to undefined]
**flowInvocationType** | [**FlowInvocationType**](FlowInvocationType.md) |  | [default to undefined]
**params** | [**Array&lt;JvmObject&gt;**](JvmObject.md) | The list of arguments to pass in to the contract method being invoked. | [default to undefined]
**timeoutMs** | **number** | The amount of milliseconds to wait for a transaction receipt beforegiving up and crashing. | [optional] [default to 60000]

## Example

```typescript
import { InvokeContractV1Request } from './api';

const instance: InvokeContractV1Request = {
    flowFullClassName,
    flowInvocationType,
    params,
    timeoutMs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
