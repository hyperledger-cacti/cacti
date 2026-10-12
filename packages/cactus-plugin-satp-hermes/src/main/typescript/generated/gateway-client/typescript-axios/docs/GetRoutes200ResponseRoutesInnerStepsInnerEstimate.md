# GetRoutes200ResponseRoutesInnerStepsInnerEstimate

Provides an estimation for a transaction, including costs, amounts, and execution duration.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**approvalAddress** | **string** | A blockchain address. | [optional] [default to undefined]
**toAmountMin** | **string** | The amount in string format including all decimals. | [optional] [default to undefined]
**toAmount** | **string** | The amount in string format including all decimals. | [optional] [default to undefined]
**fromAmount** | **string** | The amount in string format including all decimals. | [optional] [default to undefined]
**feeCosts** | [**Array&lt;GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner&gt;**](GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner.md) | A collection of fee costs associated with the transaction. | [optional] [default to undefined]
**gasCosts** | [**Array&lt;GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner&gt;**](GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner.md) | A collection of estimated gas costs for executing the transaction. | [optional] [default to undefined]
**executionDuration** | **number** | The estimated duration for the transaction execution in seconds. | [optional] [default to undefined]
**fromAmountUSD** | **string** | The amount in string format including all decimals. | [optional] [default to undefined]
**toAmountUSD** | **string** | The amount in string format including all decimals. | [optional] [default to undefined]
**tool** | **string** | The tool or service used to generate this estimate. | [optional] [default to undefined]

## Example

```typescript
import { GetRoutes200ResponseRoutesInnerStepsInnerEstimate } from './api';

const instance: GetRoutes200ResponseRoutesInnerStepsInnerEstimate = {
    approvalAddress,
    toAmountMin,
    toAmount,
    fromAmount,
    feeCosts,
    gasCosts,
    executionDuration,
    fromAmountUSD,
    toAmountUSD,
    tool,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
