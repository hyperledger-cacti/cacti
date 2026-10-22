# CreateViewRequest

Request object for createViewV1 endpoint

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**stateIds** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**tI** | **string** |  | [optional] [default to undefined]
**tF** | **string** |  | [optional] [default to undefined]
**viewID** | **string** |  | [optional] [default to undefined]
**strategyId** | **string** |  | [default to undefined]
**networkDetails** | [**CreateViewRequestNetworkDetails**](CreateViewRequestNetworkDetails.md) |  | [default to undefined]

## Example

```typescript
import { CreateViewRequest } from './api';

const instance: CreateViewRequest = {
    stateIds,
    tI,
    tF,
    viewID,
    strategyId,
    networkDetails,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
