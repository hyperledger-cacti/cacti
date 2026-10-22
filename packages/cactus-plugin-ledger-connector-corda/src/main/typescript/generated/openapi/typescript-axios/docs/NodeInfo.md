# NodeInfo


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**addresses** | [**Array&lt;NetworkHostAndPort&gt;**](NetworkHostAndPort.md) |  | [default to undefined]
**platformVersion** | **number** |  | [default to undefined]
**serial** | **number** |  | [default to undefined]
**legalIdentities** | [**Array&lt;Party&gt;**](Party.md) |  | [default to undefined]
**legalIdentitiesAndCerts** | **Array&lt;object&gt;** |  | [default to undefined]

## Example

```typescript
import { NodeInfo } from './api';

const instance: NodeInfo = {
    addresses,
    platformVersion,
    serial,
    legalIdentities,
    legalIdentitiesAndCerts,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
