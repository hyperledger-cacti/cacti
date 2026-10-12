# DeploymentTargetOrgFabric2x


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**_transient** | **string** | Transient map of arguments in JSON encoding | [optional] [default to undefined]
**CORE_PEER_LOCALMSPID** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**CORE_PEER_ADDRESS** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**CORE_PEER_MSPCONFIGPATH** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**CORE_PEER_TLS_ROOTCERT_FILE** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**ORDERER_TLS_ROOTCERT_FILE** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]

## Example

```typescript
import { DeploymentTargetOrgFabric2x } from './api';

const instance: DeploymentTargetOrgFabric2x = {
    _transient,
    CORE_PEER_LOCALMSPID,
    CORE_PEER_ADDRESS,
    CORE_PEER_MSPCONFIGPATH,
    CORE_PEER_TLS_ROOTCERT_FILE,
    ORDERER_TLS_ROOTCERT_FILE,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
