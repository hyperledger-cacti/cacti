# NewContractObj


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractAddress** | **string** | Contract address | [default to undefined]
**inputAmount** | **number** |  | [optional] [default to undefined]
**outputAmount** | **number** |  | [default to undefined]
**expiration** | **number** |  | [default to undefined]
**hashLock** | **string** |  | [default to undefined]
**receiver** | **string** |  | [optional] [default to undefined]
**outputNetwork** | **string** |  | [default to undefined]
**outputAddress** | **string** |  | [default to undefined]
**connectorId** | **string** | connectorId for the connector besu plugin | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**keychainId** | **string** | keychainId for the keychian plugin | [default to undefined]
**gas** | [**NewContractObjGas**](NewContractObjGas.md) |  | [optional] [default to undefined]

## Example

```typescript
import { NewContractObj } from './api';

const instance: NewContractObj = {
    contractAddress,
    inputAmount,
    outputAmount,
    expiration,
    hashLock,
    receiver,
    outputNetwork,
    outputAddress,
    connectorId,
    web3SigningCredential,
    keychainId,
    gas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
