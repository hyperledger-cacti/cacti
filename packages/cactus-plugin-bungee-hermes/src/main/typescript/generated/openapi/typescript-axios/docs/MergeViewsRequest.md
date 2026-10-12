# MergeViewsRequest

This is the input for a mergeViewRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**serializedViews** | **Array&lt;string&gt;** | Array of serialized views | [default to undefined]
**mergePolicy** | [**MergePolicyOpts**](MergePolicyOpts.md) |  | [default to undefined]
**policyArguments** | **Array&lt;string&gt;** | Arguments for the privacy policy function. Order is important | [optional] [default to undefined]

## Example

```typescript
import { MergeViewsRequest } from './api';

const instance: MergeViewsRequest = {
    serializedViews,
    mergePolicy,
    policyArguments,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
