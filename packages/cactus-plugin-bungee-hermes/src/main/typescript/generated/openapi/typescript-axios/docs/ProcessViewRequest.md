# ProcessViewRequest

This is the input for a mergeViewRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**serializedView** | **string** |  | [default to undefined]
**policyId** | [**PrivacyPolicyOpts**](PrivacyPolicyOpts.md) |  | [default to undefined]
**policyArguments** | **Array&lt;string&gt;** | Arguments for the privacy policy function. Order is important | [default to undefined]

## Example

```typescript
import { ProcessViewRequest } from './api';

const instance: ProcessViewRequest = {
    serializedView,
    policyId,
    policyArguments,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
