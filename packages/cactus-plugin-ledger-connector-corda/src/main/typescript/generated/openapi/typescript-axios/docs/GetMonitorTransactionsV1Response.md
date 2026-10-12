# GetMonitorTransactionsV1Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** | Flag set to true if operation completed correctly. | [default to undefined]
**msg** | **string** | Message describing operation status or any errors that occurred. | [default to undefined]
**stateFullClassName** | **string** | The fully qualified name of the Corda state to monitor | [optional] [default to undefined]
**tx** | [**Array&lt;GetMonitorTransactionsV1ResponseTxInner&gt;**](GetMonitorTransactionsV1ResponseTxInner.md) |  | [optional] [default to undefined]

## Example

```typescript
import { GetMonitorTransactionsV1Response } from './api';

const instance: GetMonitorTransactionsV1Response = {
    success,
    msg,
    stateFullClassName,
    tx,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
