# GetActiveContractsResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contracts** | [**Array&lt;ActiveContract&gt;**](ActiveContract.md) |  | [default to undefined]
**activeAtOffset** | **number** | The ledger offset of the snapshot. Continue from it with the ledger\&#39;s update stream. | [default to undefined]
**limitReached** | **boolean** | True when the ledger returned &#x60;limit&#x60; entries, so more active contracts may match. | [default to undefined]

## Example

```typescript
import { GetActiveContractsResponse } from './api';

const instance: GetActiveContractsResponse = {
    contracts,
    activeAtOffset,
    limitReached,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
