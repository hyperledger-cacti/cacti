# GetSingleStatusRequest

Defines the parameters for retrieving the single status of the HTLC swap.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**connectorId** | **string** |  | [default to undefined]
**keychainId** | **string** |  | [default to undefined]

## Example

```typescript
import { GetSingleStatusRequest } from './api';

const instance: GetSingleStatusRequest = {
    id,
    web3SigningCredential,
    connectorId,
    keychainId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
