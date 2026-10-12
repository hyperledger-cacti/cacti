# GetRoutes200ResponseRoutesInnerStepsInnerAction

Describes the action to be performed in a transaction step, including token details, amounts, slippage, and addresses involved.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**fromToken** | [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] [default to undefined]
**fromAmount** | **string** | The amount of \&#39;fromToken\&#39; to be transferred, specified as a string to maintain precision. | [optional] [default to undefined]
**toToken** | [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] [default to undefined]
**slippage** | **number** | The maximum acceptable difference between the expected price of the \&#39;toToken\&#39; and the price at the time of the transfer. | [optional] [default to undefined]
**fromAddress** | **string** | A blockchain address. | [optional] [default to undefined]
**toAddress** | **string** | A blockchain address. | [optional] [default to undefined]

## Example

```typescript
import { GetRoutes200ResponseRoutesInnerStepsInnerAction } from './api';

const instance: GetRoutes200ResponseRoutesInnerStepsInnerAction = {
    fromToken,
    fromAmount,
    toToken,
    slippage,
    fromAddress,
    toAddress,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
