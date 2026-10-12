# NetworkId

The network of the DLT being interacted with.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | The network of the DLT being interacted with. | [default to undefined]
**ledgerType** | **string** | Enumerates the different ledger vendors and their major versions encoded within the name of the LedgerType. For example \&quot;BESU_1X\&quot; involves all of the [1.0.0;2.0.0) where 1.0.0 is included and anything up until, but not 2.0.0. See: https://stackoverflow.com/a/4396303/698470 for further explanation. | [default to undefined]

## Example

```typescript
import { NetworkId } from './api';

const instance: NetworkId = {
    id,
    ledgerType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
