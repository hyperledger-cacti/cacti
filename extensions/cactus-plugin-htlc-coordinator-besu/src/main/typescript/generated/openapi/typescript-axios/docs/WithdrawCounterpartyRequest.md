# WithdrawCounterpartyRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**htlcPackage** | [**HtlcPackage**](HtlcPackage.md) |  | [default to undefined]
**connectorInstanceId** | **string** | connector Instance Id for the connector plugin | [default to undefined]
**keychainId** | **string** | keychainId for the keychain plugin | [default to undefined]
**contractId** | **string** | contractId for the contract | [optional] [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**htlcId** | **string** | Id for the HTLC | [default to undefined]
**secret** | **string** | Counterparty HTLC secret | [default to undefined]
**gas** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { WithdrawCounterpartyRequest } from './api';

const instance: WithdrawCounterpartyRequest = {
    htlcPackage,
    connectorInstanceId,
    keychainId,
    contractId,
    web3SigningCredential,
    htlcId,
    secret,
    gas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
