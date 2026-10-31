# ActiveContract


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractId** | **string** |  | [default to undefined]
**templateId** | **string** | The template ID as reported by the ledger, using the package ID (&#x60;&lt;package-id&gt;:Module:Template&#x60;). | [default to undefined]
**createArgument** | **{ [key: string]: any; }** | A Daml record encoded as a JSON object of field names to Daml values. | [default to undefined]
**witnessParties** | **Array&lt;string&gt;** |  | [default to undefined]
**signatories** | **Array&lt;string&gt;** |  | [default to undefined]
**observers** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**synchronizerId** | **string** |  | [default to undefined]
**interfaceViews** | [**Array&lt;ActiveContractInterfaceView&gt;**](ActiveContractInterfaceView.md) | Interface views, present when the query used interfaceIds. | [optional] [default to undefined]

## Example

```typescript
import { ActiveContract } from './api';

const instance: ActiveContract = {
    contractId,
    templateId,
    createArgument,
    witnessParties,
    signatories,
    observers,
    createdAt,
    synchronizerId,
    interfaceViews,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
