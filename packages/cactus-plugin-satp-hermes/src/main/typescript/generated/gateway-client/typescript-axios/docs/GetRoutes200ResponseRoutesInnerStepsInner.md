# GetRoutes200ResponseRoutesInnerStepsInner

Details a single step within a route including actions and estimates.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Id of the step | [optional] [default to undefined]
**type** | **string** | Type of the step, typically describing the action, e.g., \&#39;swap\&#39;. | [optional] [default to undefined]
**tool** | **string** | Tool used in the step, e.g., \&#39;stargate\&#39;. | [optional] [default to undefined]
**action** | [**GetRoutes200ResponseRoutesInnerStepsInnerAction**](GetRoutes200ResponseRoutesInnerStepsInnerAction.md) |  | [optional] [default to undefined]
**estimate** | [**GetRoutes200ResponseRoutesInnerStepsInnerEstimate**](GetRoutes200ResponseRoutesInnerStepsInnerEstimate.md) |  | [optional] [default to undefined]
**toolDetails** | [**GetRoutes200ResponseRoutesInnerStepsInnerToolDetails**](GetRoutes200ResponseRoutesInnerStepsInnerToolDetails.md) |  | [optional] [default to undefined]
**integrationDetails** | [**GetRoutes200ResponseRoutesInnerStepsInnerToolDetails**](GetRoutes200ResponseRoutesInnerStepsInnerToolDetails.md) |  | [optional] [default to undefined]
**includedStepIds** | **Array&lt;string&gt;** | IDs of further steps included within this step, allowing for nested actions without direct recursion. | [optional] [default to undefined]

## Example

```typescript
import { GetRoutes200ResponseRoutesInnerStepsInner } from './api';

const instance: GetRoutes200ResponseRoutesInnerStepsInner = {
    id,
    type,
    tool,
    action,
    estimate,
    toolDetails,
    integrationDetails,
    includedStepIds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
