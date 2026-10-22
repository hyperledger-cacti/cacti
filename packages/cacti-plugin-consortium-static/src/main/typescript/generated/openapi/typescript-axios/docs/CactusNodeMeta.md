# CactusNodeMeta

A Cactus node meta information

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**nodeApiHost** | **string** |  | [default to undefined]
**publicKeyPem** | **string** | The PEM encoded public key that was used to generate the JWS included in the response (the jws property) | [default to undefined]

## Example

```typescript
import { CactusNodeMeta } from './api';

const instance: CactusNodeMeta = {
    nodeApiHost,
    publicKeyPem,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
