# RegisterOracleTaskRequestListeningOptions

Options for event listening. Only if taskMode is EVENT_LISTENING.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**eventSignature** | **string** | The event signature to listen for on the source network. Only if taskMode is EVENT_LISTENING. | [default to undefined]
**filterParams** | **Array&lt;string&gt;** | The parameters to filter in the captured events. | [optional] [default to undefined]

## Example

```typescript
import { RegisterOracleTaskRequestListeningOptions } from './api';

const instance: RegisterOracleTaskRequestListeningOptions = {
    eventSignature,
    filterParams,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
