# Token

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ChainID** | **string** | The network of the DLT being interacted with. TODO: implement network identification draft | 
**ChainType** | **string** | Supported DLT protocols. | 
**Address** | **string** | A blockchain address. | 
**Name** | Pointer to **string** | The name of the token. | [optional] 
**Symbol** | **string** | The symbol of the token. | 
**Decimals** | **int32** | How many decimals the token supports. | 
**LogoURI** | Pointer to **string** | The logo of a token, chain, dex etc. | [optional] 
**Tags** | Pointer to **[]string** | List of tags identifiers providing additional context or categorization. | [optional] 
**PriceUSD** | Pointer to **string** | The current price of the token in USD. | [optional] 
**Extensions** | Pointer to [**GetRoutes200ResponseRoutesInnerFromTokenExtensions**](GetRoutes200ResponseRoutesInnerFromTokenExtensions.md) |  | [optional] 

## Methods

### NewToken

`func NewToken(chainID string, chainType string, address string, symbol string, decimals int32, ) *Token`

NewToken instantiates a new Token object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTokenWithDefaults

`func NewTokenWithDefaults() *Token`

NewTokenWithDefaults instantiates a new Token object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChainID

`func (o *Token) GetChainID() string`

GetChainID returns the ChainID field if non-nil, zero value otherwise.

### GetChainIDOk

`func (o *Token) GetChainIDOk() (*string, bool)`

GetChainIDOk returns a tuple with the ChainID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChainID

`func (o *Token) SetChainID(v string)`

SetChainID sets ChainID field to given value.


### GetChainType

`func (o *Token) GetChainType() string`

GetChainType returns the ChainType field if non-nil, zero value otherwise.

### GetChainTypeOk

`func (o *Token) GetChainTypeOk() (*string, bool)`

GetChainTypeOk returns a tuple with the ChainType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChainType

`func (o *Token) SetChainType(v string)`

SetChainType sets ChainType field to given value.


### GetAddress

`func (o *Token) GetAddress() string`

GetAddress returns the Address field if non-nil, zero value otherwise.

### GetAddressOk

`func (o *Token) GetAddressOk() (*string, bool)`

GetAddressOk returns a tuple with the Address field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAddress

`func (o *Token) SetAddress(v string)`

SetAddress sets Address field to given value.


### GetName

`func (o *Token) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *Token) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *Token) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *Token) HasName() bool`

HasName returns a boolean if a field has been set.

### GetSymbol

`func (o *Token) GetSymbol() string`

GetSymbol returns the Symbol field if non-nil, zero value otherwise.

### GetSymbolOk

`func (o *Token) GetSymbolOk() (*string, bool)`

GetSymbolOk returns a tuple with the Symbol field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSymbol

`func (o *Token) SetSymbol(v string)`

SetSymbol sets Symbol field to given value.


### GetDecimals

`func (o *Token) GetDecimals() int32`

GetDecimals returns the Decimals field if non-nil, zero value otherwise.

### GetDecimalsOk

`func (o *Token) GetDecimalsOk() (*int32, bool)`

GetDecimalsOk returns a tuple with the Decimals field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDecimals

`func (o *Token) SetDecimals(v int32)`

SetDecimals sets Decimals field to given value.


### GetLogoURI

`func (o *Token) GetLogoURI() string`

GetLogoURI returns the LogoURI field if non-nil, zero value otherwise.

### GetLogoURIOk

`func (o *Token) GetLogoURIOk() (*string, bool)`

GetLogoURIOk returns a tuple with the LogoURI field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLogoURI

`func (o *Token) SetLogoURI(v string)`

SetLogoURI sets LogoURI field to given value.

### HasLogoURI

`func (o *Token) HasLogoURI() bool`

HasLogoURI returns a boolean if a field has been set.

### GetTags

`func (o *Token) GetTags() []string`

GetTags returns the Tags field if non-nil, zero value otherwise.

### GetTagsOk

`func (o *Token) GetTagsOk() (*[]string, bool)`

GetTagsOk returns a tuple with the Tags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTags

`func (o *Token) SetTags(v []string)`

SetTags sets Tags field to given value.

### HasTags

`func (o *Token) HasTags() bool`

HasTags returns a boolean if a field has been set.

### GetPriceUSD

`func (o *Token) GetPriceUSD() string`

GetPriceUSD returns the PriceUSD field if non-nil, zero value otherwise.

### GetPriceUSDOk

`func (o *Token) GetPriceUSDOk() (*string, bool)`

GetPriceUSDOk returns a tuple with the PriceUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPriceUSD

`func (o *Token) SetPriceUSD(v string)`

SetPriceUSD sets PriceUSD field to given value.

### HasPriceUSD

`func (o *Token) HasPriceUSD() bool`

HasPriceUSD returns a boolean if a field has been set.

### GetExtensions

`func (o *Token) GetExtensions() GetRoutes200ResponseRoutesInnerFromTokenExtensions`

GetExtensions returns the Extensions field if non-nil, zero value otherwise.

### GetExtensionsOk

`func (o *Token) GetExtensionsOk() (*GetRoutes200ResponseRoutesInnerFromTokenExtensions, bool)`

GetExtensionsOk returns a tuple with the Extensions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExtensions

`func (o *Token) SetExtensions(v GetRoutes200ResponseRoutesInnerFromTokenExtensions)`

SetExtensions sets Extensions field to given value.

### HasExtensions

`func (o *Token) HasExtensions() bool`

HasExtensions returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


