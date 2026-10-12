# RefundReq


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Contract htlc id for refund | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**connectorId** | **string** | connectorId for the connector besu plugin | [default to undefined]
**keychainId** | **string** | keychainId for the keychain plugin | [default to undefined]
**gas** | [**NewContractObjGas**](NewContractObjGas.md) |  | [optional] [default to undefined]

## Example

```typescript
import { RefundReq } from './api';

const instance: RefundReq = {
    id,
    web3SigningCredential,
    connectorId,
    keychainId,
    gas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
