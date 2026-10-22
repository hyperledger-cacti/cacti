# Asset

An asset

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**owner** | **string** |  | [default to undefined]
**contractName** | **string** |  | [default to undefined]
**contractAddress** | **string** |  | [optional] [default to undefined]
**mspId** | **string** |  | [optional] [default to undefined]
**channelName** | **string** |  | [optional] [default to undefined]
**amount** | **string** |  | [optional] [default to undefined]
**networkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [default to undefined]
**tokenType** | **string** | The type of token. | [default to undefined]
**referenceId** | **string** |  | [default to undefined]
**ercTokenStandard** | **string** | The ERC token standard. | [default to undefined]
**uniqueDescriptor** | **string** | Token ID or unique descriptor for ERC6909/ERC1155 tokens. | [optional] [default to undefined]

## Example

```typescript
import { Asset } from './api';

const instance: Asset = {
    id,
    owner,
    contractName,
    contractAddress,
    mspId,
    channelName,
    amount,
    networkId,
    tokenType,
    referenceId,
    ercTokenStandard,
    uniqueDescriptor,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
