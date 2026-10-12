# GasCost

Details about a specific gas cost associated with the transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **string** | The type of the gas cost. | [optional] [default to undefined]
**price** | **string** | The gas price, specified as a string to maintain precision. | [optional] [default to undefined]
**estimate** | **string** | The estimated gas required, specified as a string to maintain precision. | [optional] [default to undefined]
**limit** | **string** | The gas limit for the transaction, specified as a string to maintain precision. | [optional] [default to undefined]
**amount** | **string** | The amount of gas required in the gas currency. | [optional] [default to undefined]
**amountUSD** | **string** | The amount of gas required in USD. | [optional] [default to undefined]
**token** | [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] [default to undefined]

## Example

```typescript
import { GasCost } from './api';

const instance: GasCost = {
    type,
    price,
    estimate,
    limit,
    amount,
    amountUSD,
    token,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
