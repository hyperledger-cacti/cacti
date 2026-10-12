# Token

Metadata detailing a supported token

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**chainID** | **string** | The network of the DLT being interacted with. TODO: implement network identification draft | [default to undefined]
**chainType** | **string** | Supported DLT protocols. | [default to undefined]
**address** | **string** | A blockchain address. | [default to undefined]
**name** | **string** | The name of the token. | [optional] [default to undefined]
**symbol** | **string** | The symbol of the token. | [default to undefined]
**decimals** | **number** | How many decimals the token supports. | [default to undefined]
**logoURI** | **string** | The logo of a token, chain, dex etc. | [optional] [default to undefined]
**tags** | **Array&lt;string&gt;** | List of tags identifiers providing additional context or categorization. | [optional] [default to undefined]
**priceUSD** | **string** | The current price of the token in USD. | [optional] [default to undefined]
**extensions** | [**GetRoutes200ResponseRoutesInnerFromTokenExtensions**](GetRoutes200ResponseRoutesInnerFromTokenExtensions.md) |  | [optional] [default to undefined]

## Example

```typescript
import { Token } from './api';

const instance: Token = {
    chainID,
    chainType,
    address,
    name,
    symbol,
    decimals,
    logoURI,
    tags,
    priceUSD,
    extensions,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
