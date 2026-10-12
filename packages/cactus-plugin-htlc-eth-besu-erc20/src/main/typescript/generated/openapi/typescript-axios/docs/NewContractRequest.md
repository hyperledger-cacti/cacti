# NewContractRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contractAddress** | **string** | Contract address | [default to undefined]
**inputAmount** | **number** | Input amount to lock | [default to undefined]
**outputAmount** | **number** | Output amount to lock | [default to undefined]
**expiration** | **number** | Timestamp to expire the contract | [default to undefined]
**hashLock** | **string** | Hashlock needed to refund the amount | [default to undefined]
**tokenAddress** | **string** | The token address | [default to undefined]
**receiver** | **string** | The receiver address | [default to undefined]
**outputNetwork** | **string** | The output network id | [default to undefined]
**outputAddress** | **string** | The output address to receive the tokens | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**connectorId** | **string** | connectorId for the connector besu plugin | [default to undefined]
**keychainId** | **string** | keychainId for the keychian plugin | [default to undefined]
**gas** | [**NewContractRequestGas**](NewContractRequestGas.md) |  | [optional] [default to undefined]

## Example

```typescript
import { NewContractRequest } from './api';

const instance: NewContractRequest = {
    contractAddress,
    inputAmount,
    outputAmount,
    expiration,
    hashLock,
    tokenAddress,
    receiver,
    outputNetwork,
    outputAddress,
    web3SigningCredential,
    connectorId,
    keychainId,
    gas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
