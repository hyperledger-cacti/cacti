# CounterpartyHTLCRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**htlcPackage** | [**HtlcPackage**](HtlcPackage.md) |  | [default to undefined]
**connectorInstanceId** | **string** | connector Instance Id for the connector plugin | [default to undefined]
**keychainId** | **string** | keychainId for the keychain plugin | [default to undefined]
**htlcId** | **string** | Id for the HTLC | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**gas** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { CounterpartyHTLCRequest } from './api';

const instance: CounterpartyHTLCRequest = {
    htlcPackage,
    connectorInstanceId,
    keychainId,
    htlcId,
    web3SigningCredential,
    gas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
