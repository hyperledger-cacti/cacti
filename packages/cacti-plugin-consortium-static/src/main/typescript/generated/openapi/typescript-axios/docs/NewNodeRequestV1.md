# NewNodeRequestV1


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**identity** | [**Identity**](Identity.md) |  | [default to undefined]
**treeHash** | **string** | proof of common configs and policies defined by the consortium | [default to undefined]
**node** | [**CactusNode**](CactusNode.md) |  | [default to undefined]
**ledger** | [**Array&lt;Ledger&gt;**](Ledger.md) | Ledger metadata | [default to undefined]
**pluginInstance** | [**Array&lt;PluginInstance&gt;**](PluginInstance.md) | Plugin Instance metadata | [default to undefined]
**signature** | **string** | signature of the message | [default to undefined]

## Example

```typescript
import { NewNodeRequestV1 } from './api';

const instance: NewNodeRequestV1 = {
    identity,
    treeHash,
    node,
    ledger,
    pluginInstance,
    signature,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
