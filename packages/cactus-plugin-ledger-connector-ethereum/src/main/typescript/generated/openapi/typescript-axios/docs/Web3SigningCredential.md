# Web3SigningCredential


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | [**Web3SigningCredentialType**](Web3SigningCredentialType.md) |  | [default to undefined]
**ethAccount** | **string** | The ethereum account (public key) that the credential belongs to. Basically the username in the traditional terminology of authentication. | [default to undefined]
**secret** | **string** | The HEX encoded private key of an eth account. | [default to undefined]
**keychainEntryKey** | **string** | The key to use when looking up the the keychain entry holding the secret pointed to by the  keychainEntryKey parameter. | [default to undefined]
**keychainId** | **string** | The keychain ID to use when looking up the the keychain plugin instance that will be used to retrieve the secret pointed to by the keychainEntryKey parameter. | [optional] [default to undefined]

## Example

```typescript
import { Web3SigningCredential } from './api';

const instance: Web3SigningCredential = {
    type,
    ethAccount,
    secret,
    keychainEntryKey,
    keychainId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
