# FabricCertificateIdentityV1

Combination of certificate and it\'s MSP ID used to identify fabric actors.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**mspid** | **string** |  | [default to undefined]
**cert** | [**FabricX509CertificateV1**](FabricX509CertificateV1.md) |  | [default to undefined]

## Example

```typescript
import { FabricCertificateIdentityV1 } from './api';

const instance: FabricCertificateIdentityV1 = {
    mspid,
    cert,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
