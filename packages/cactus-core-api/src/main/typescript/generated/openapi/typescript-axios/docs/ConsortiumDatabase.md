# ConsortiumDatabase


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**consortium** | [**Array&lt;Consortium&gt;**](Consortium.md) | A collection of Consortium entities. In practice this should only ever contain a single consortium, but we defined it as an array to keep the convention up with the rest of the collections defined in the Consortium data in general. Also, if we ever decide to somehow have some sort of consortium to consortium integration (which does not make much sense in the current frame of mind of the author in the year 2020) then having this as an array will have proven itself to be an excellent long term compatibility/extensibility decision indeed. | [default to undefined]
**ledger** | [**Array&lt;Ledger&gt;**](Ledger.md) | The complete collection of all ledger entities in existence within the consortium. | [default to undefined]
**consortiumMember** | [**Array&lt;ConsortiumMember&gt;**](ConsortiumMember.md) | The complete collection of all consortium member entities in existence within the consortium. | [default to undefined]
**cactusNode** | [**Array&lt;CactusNode&gt;**](CactusNode.md) | The complete collection of all cactus nodes entities in existence within the consortium. | [default to undefined]
**pluginInstance** | [**Array&lt;PluginInstance&gt;**](PluginInstance.md) | The complete collection of all plugin instance entities in existence within the consortium. | [default to undefined]

## Example

```typescript
import { ConsortiumDatabase } from './api';

const instance: ConsortiumDatabase = {
    consortium,
    ledger,
    consortiumMember,
    cactusNode,
    pluginInstance,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
