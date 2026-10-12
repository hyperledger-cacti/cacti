# FeeCost

Details about a specific fee cost associated with the transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Name of the fee cost. | [optional] [default to undefined]
**amount** | **string** | The amount in string format including all decimals. | [optional] [default to undefined]
**amountUSD** | **string** | The amount in string format including all decimals. | [optional] [default to undefined]
**token** | **string** | The symbol of a token | [optional] [default to undefined]
**included** | **boolean** | Indicates if the fee is included in the transaction amount. | [optional] [default to undefined]

## Example

```typescript
import { FeeCost } from './api';

const instance: FeeCost = {
    name,
    amount,
    amountUSD,
    token,
    included,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
