# GetActiveContractsRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parties** | **Array&lt;string&gt;** |  | [default to undefined]
**templateIds** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**interfaceIds** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**offset** | **number** |  | [optional] [default to undefined]
**limit** | **number** | Maximum number of entries to return. The connector rejects values above its configured maxActiveContractLimit (default 200, Canton\&#39;s default http-list-max-elements-limit). | [optional] [default to 100]

## Example

```typescript
import { GetActiveContractsRequest } from './api';

const instance: GetActiveContractsRequest = {
    parties,
    templateIds,
    interfaceIds,
    offset,
    limit,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
