# GetApproveAddressRequest

Request schema for getting the address to approve the token transfer.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**networkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [default to undefined]
**tokenType** | **string** | The type of token. | [default to undefined]

## Example

```typescript
import { GetApproveAddressRequest } from './api';

const instance: GetApproveAddressRequest = {
    networkId,
    tokenType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
