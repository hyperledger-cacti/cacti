# Web3SigningCredentialPrivateKeyHex


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | [**Web3SigningCredentialType**](Web3SigningCredentialType.md) |  | [default to undefined]
**ethAccount** | **string** | The ethereum account (public key) that the credential belongs to. Basically the username in the traditional terminology of authentication. | [default to undefined]
**secret** | **string** | The HEX encoded private key of an eth account. | [default to undefined]

## Example

```typescript
import { Web3SigningCredentialPrivateKeyHex } from './api';

const instance: Web3SigningCredentialPrivateKeyHex = {
    type,
    ethAccount,
    secret,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
