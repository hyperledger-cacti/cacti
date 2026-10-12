# OwnHTLCRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**htlcPackage** | [**HtlcPackage**](HtlcPackage.md) |  | [default to undefined]
**connectorInstanceId** | **string** | connector Instance Id for the connector plugin | [default to undefined]
**keychainId** | **string** | keychainId for the keychain plugin | [default to undefined]
**constructorArgs** | **Array&lt;any&gt;** |  | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**inputAmount** | **number** | Input amount to lock | [default to undefined]
**outputAmount** | **number** | Output amount to lock | [default to undefined]
**expiration** | **number** | Timestamp to expire the contract | [default to undefined]
**hashLock** | **string** | Hashlock needed to refund the amount | [default to undefined]
**tokenAddress** | **string** | The token address | [default to undefined]
**receiver** | **string** | The receiver address | [default to undefined]
**outputNetwork** | **string** | The output network id | [default to undefined]
**outputAddress** | **string** | The output addreess to receive the tokens | [default to undefined]
**gas** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { OwnHTLCRequest } from './api';

const instance: OwnHTLCRequest = {
    htlcPackage,
    connectorInstanceId,
    keychainId,
    constructorArgs,
    web3SigningCredential,
    inputAmount,
    outputAmount,
    expiration,
    hashLock,
    tokenAddress,
    receiver,
    outputNetwork,
    outputAddress,
    gas,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
