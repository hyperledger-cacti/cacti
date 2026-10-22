# InitializeRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**connectorId** | **string** | connectorId for the connector besu plugin | [default to undefined]
**keychainId** | **string** | keychainId for the keychain plugin | [default to undefined]
**constructorArgs** | **Array&lt;any&gt;** |  | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**gas** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { InitializeRequest } from './api';

const instance: InitializeRequest = {
    connectorId,
    keychainId,
    constructorArgs,
    web3SigningCredential,
    gas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
