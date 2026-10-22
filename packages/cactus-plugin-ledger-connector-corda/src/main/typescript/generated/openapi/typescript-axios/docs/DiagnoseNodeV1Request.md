# DiagnoseNodeV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**nodeIds** | **Array&lt;string&gt;** | Optional property specifying which Corda Node should be the one being diagnosed in case the Connector has multiple connections established for different nodes (which is not yet a supported feature, but we want to keep this possibility open for the future). | [optional] [default to undefined]

## Example

```typescript
import { DiagnoseNodeV1Request } from './api';

const instance: DiagnoseNodeV1Request = {
    nodeIds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
