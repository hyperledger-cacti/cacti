# GetStatusRequest

Defines the parameters for retrieving the status of the HTLC swap.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ids** | **Array&lt;string&gt;** |  | [default to undefined]
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**connectorId** | **string** |  | [default to undefined]
**keychainId** | **string** |  | [default to undefined]

## Example

```typescript
import { GetStatusRequest } from './api';

const instance: GetStatusRequest = {
    ids,
    web3SigningCredential,
    connectorId,
    keychainId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
