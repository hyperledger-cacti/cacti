# ActiveContractInterfaceView

The view of an active contract through one of the queried interfaces.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**interfaceId** | **string** |  | [default to undefined]
**viewStatus** | [**ActiveContractInterfaceViewViewStatus**](ActiveContractInterfaceViewViewStatus.md) |  | [default to undefined]
**viewValue** | **any** | The computed interface view, present when the view status code is 0. | [optional] [default to undefined]

## Example

```typescript
import { ActiveContractInterfaceView } from './api';

const instance: ActiveContractInterfaceView = {
    interfaceId,
    viewStatus,
    viewValue,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
