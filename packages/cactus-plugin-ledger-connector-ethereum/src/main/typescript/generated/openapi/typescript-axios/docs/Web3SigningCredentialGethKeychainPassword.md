# Web3SigningCredentialGethKeychainPassword


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | [**Web3SigningCredentialType**](Web3SigningCredentialType.md) |  | [default to undefined]
**ethAccount** | **string** | The ethereum account (public key) that the credential  belongs to. Basically the username in the traditional terminology of authentication. | [default to undefined]
**secret** | **string** | A geth keychain unlock password. | [default to undefined]

## Example

```typescript
import { Web3SigningCredentialGethKeychainPassword } from './api';

const instance: Web3SigningCredentialGethKeychainPassword = {
    type,
    ethAccount,
    secret,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
