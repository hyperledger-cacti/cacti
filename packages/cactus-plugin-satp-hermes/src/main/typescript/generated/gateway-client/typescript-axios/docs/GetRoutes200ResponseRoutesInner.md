# GetRoutes200ResponseRoutesInner

Details a specific route for asset transfer or data handling between DLT networks, including parameters such as amounts, tokens, steps involved, and insurance information.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | A unique identifier of the route. | [default to undefined]
**gatewayID** | **string** | A unique identifier for the gateway. | [default to undefined]
**mode** | **string** | The mode of operation for this route - \&#39;data\&#39; for arbitrary payload handling, \&#39;transfer\&#39; for asset transfer. | [default to undefined]
**fromDLTNetworkID** | **string** | The ID of the DLT Network where the operation will originate. | [optional] [default to undefined]
**fromAmountUSD** | **number** | The amount of \&#39;fromToken\&#39; to be transferred in USD, specified as a string to maintain precision. | [optional] [default to undefined]
**fromAmount** | **string** | The amount that should be sent including all decimals (e.g., 1000000 for 1 USDC (6 decimals)). | [optional] [default to undefined]
**fromToken** | [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] [default to undefined]
**toDLTNetworkID** | **string** | The ID of the DLT Network where the operation will end. | [optional] [default to undefined]
**toAmountUSD** | **string** | The expected amount to be received in USD. | [optional] [default to undefined]
**toAmount** | **string** | The expected amount to be received including all decimals (e.g., 1000000 for 1 USDC (6 decimals)). | [optional] [default to undefined]
**toAmountMin** | **string** | The minimum expected amount to be received including all decimals (e.g., 1000000 for 1 USDC (6 decimals)). | [optional] [default to undefined]
**toToken** | [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] [default to undefined]
**gasCostUSD** | **string** | The expected gas cost in USD. | [optional] [default to undefined]
**containsSwitchChain** | **boolean** | Whether chain switching is enabled or not. | [optional] [default to undefined]
**steps** | [**Array&lt;GetRoutes200ResponseRoutesInnerStepsInner&gt;**](GetRoutes200ResponseRoutesInnerStepsInner.md) | List of steps involved in this route, adjusted for mode. | [optional] [default to undefined]
**insurance** | [**GetRoutes200ResponseRoutesInnerInsurance**](GetRoutes200ResponseRoutesInnerInsurance.md) |  | [optional] [default to undefined]
**tags** | **Array&lt;string&gt;** | List of tags identifiers providing additional context or categorization. | [optional] [default to undefined]

## Example

```typescript
import { GetRoutes200ResponseRoutesInner } from './api';

const instance: GetRoutes200ResponseRoutesInner = {
    id,
    gatewayID,
    mode,
    fromDLTNetworkID,
    fromAmountUSD,
    fromAmount,
    fromToken,
    toDLTNetworkID,
    toAmountUSD,
    toAmount,
    toAmountMin,
    toToken,
    gasCostUSD,
    containsSwitchChain,
    steps,
    insurance,
    tags,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
