# DeploymentTargetOrganization


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CORE_PEER_LOCALMSPID** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**CORE_PEER_ADDRESS** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**CORE_PEER_MSPCONFIG** | [**Array&lt;FileBase64&gt;**](FileBase64.md) | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**CORE_PEER_TLS_ROOTCERT** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]
**ORDERER_TLS_ROOTCERT** | **string** | Mapped to environment variables of the Fabric CLI container. | [default to undefined]

## Example

```typescript
import { DeploymentTargetOrganization } from './api';

const instance: DeploymentTargetOrganization = {
    CORE_PEER_LOCALMSPID,
    CORE_PEER_ADDRESS,
    CORE_PEER_MSPCONFIG,
    CORE_PEER_TLS_ROOTCERT,
    ORDERER_TLS_ROOTCERT,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
