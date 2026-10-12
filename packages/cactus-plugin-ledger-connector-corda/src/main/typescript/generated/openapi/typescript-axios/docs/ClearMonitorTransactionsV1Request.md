# ClearMonitorTransactionsV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**clientAppId** | **string** | ID of a client application that wants to monitor the state changes | [default to undefined]
**stateFullClassName** | **string** | The fully qualified name of the Corda state to monitor | [default to undefined]
**txIndexes** | **Array&lt;string&gt;** |  | [default to undefined]

## Example

```typescript
import { ClearMonitorTransactionsV1Request } from './api';

const instance: ClearMonitorTransactionsV1Request = {
    clientAppId,
    stateFullClassName,
    txIndexes,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
