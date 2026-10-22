# TransactionHeader


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**source** | **string** | The public key of the source account of the transaction. | [default to undefined]
**fee** | **number** | The maximum base fee in stroops to be paid for the transaction. | [default to undefined]
**timeout** | **number** | The maximum number of ledger close time in seconds that the transaction is valid for. \&#39;0\&#39; equals to no timeout. | [default to undefined]

## Example

```typescript
import { TransactionHeader } from './api';

const instance: TransactionHeader = {
    source,
    fee,
    timeout,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
