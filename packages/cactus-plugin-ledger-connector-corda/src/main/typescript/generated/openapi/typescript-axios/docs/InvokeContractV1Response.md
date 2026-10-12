# InvokeContractV1Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**callOutput** | **object** | Data returned from the JVM when no transaction is running | [default to undefined]
**transactionId** | **string** | The net.corda.core.flows.StateMachineRunId value returned by the flow execution. | [optional] [default to undefined]
**progress** | **Array&lt;string&gt;** | An array of strings representing the aggregated stream of progress updates provided by a *tracked* flow invocation. If the flow invocation was not tracked, this array is still returned, but as empty. | [optional] [default to undefined]
**flowId** | **string** | The id for the flow handle | [default to undefined]

## Example

```typescript
import { InvokeContractV1Response } from './api';

const instance: InvokeContractV1Response = {
    success,
    callOutput,
    transactionId,
    progress,
    flowId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
