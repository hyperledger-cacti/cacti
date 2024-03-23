# TransactRequestFromToken

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
**Extensions** | Pointer to [**TransactRequestFromTokenExtensions**](TransactRequestFromTokenExtensions.md) |  | [optional] 

## Methods

### NewTransactRequestFromToken

`func NewTransactRequestFromToken(chainID string, chainType string, address string, symbol string, decimals int32, ) *TransactRequestFromToken`

NewTransactRequestFromToken instantiates a new TransactRequestFromToken object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransactRequestFromTokenWithDefaults

`func NewTransactRequestFromTokenWithDefaults() *TransactRequestFromToken`

NewTransactRequestFromTokenWithDefaults instantiates a new TransactRequestFromToken object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChainID

`func (o *TransactRequestFromToken) GetChainID() string`

GetChainID returns the ChainID field if non-nil, zero value otherwise.

### GetChainIDOk

`func (o *TransactRequestFromToken) GetChainIDOk() (*string, bool)`

GetChainIDOk returns a tuple with the ChainID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChainID

`func (o *TransactRequestFromToken) SetChainID(v string)`

SetChainID sets ChainID field to given value.


### GetChainType

`func (o *TransactRequestFromToken) GetChainType() string`

GetChainType returns the ChainType field if non-nil, zero value otherwise.

### GetChainTypeOk

`func (o *TransactRequestFromToken) GetChainTypeOk() (*string, bool)`

GetChainTypeOk returns a tuple with the ChainType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChainType

`func (o *TransactRequestFromToken) SetChainType(v string)`

SetChainType sets ChainType field to given value.


### GetAddress

`func (o *TransactRequestFromToken) GetAddress() string`

GetAddress returns the Address field if non-nil, zero value otherwise.

### GetAddressOk

`func (o *TransactRequestFromToken) GetAddressOk() (*string, bool)`

GetAddressOk returns a tuple with the Address field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAddress

`func (o *TransactRequestFromToken) SetAddress(v string)`

SetAddress sets Address field to given value.


### GetName

`func (o *TransactRequestFromToken) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *TransactRequestFromToken) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *TransactRequestFromToken) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *TransactRequestFromToken) HasName() bool`

HasName returns a boolean if a field has been set.

### GetSymbol

`func (o *TransactRequestFromToken) GetSymbol() string`

GetSymbol returns the Symbol field if non-nil, zero value otherwise.

### GetSymbolOk

`func (o *TransactRequestFromToken) GetSymbolOk() (*string, bool)`

GetSymbolOk returns a tuple with the Symbol field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSymbol

`func (o *TransactRequestFromToken) SetSymbol(v string)`

SetSymbol sets Symbol field to given value.


### GetDecimals

`func (o *TransactRequestFromToken) GetDecimals() int32`

GetDecimals returns the Decimals field if non-nil, zero value otherwise.

### GetDecimalsOk

`func (o *TransactRequestFromToken) GetDecimalsOk() (*int32, bool)`

GetDecimalsOk returns a tuple with the Decimals field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDecimals

`func (o *TransactRequestFromToken) SetDecimals(v int32)`

SetDecimals sets Decimals field to given value.


### GetLogoURI

`func (o *TransactRequestFromToken) GetLogoURI() string`

GetLogoURI returns the LogoURI field if non-nil, zero value otherwise.

### GetLogoURIOk

`func (o *TransactRequestFromToken) GetLogoURIOk() (*string, bool)`

GetLogoURIOk returns a tuple with the LogoURI field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLogoURI

`func (o *TransactRequestFromToken) SetLogoURI(v string)`

SetLogoURI sets LogoURI field to given value.

### HasLogoURI

`func (o *TransactRequestFromToken) HasLogoURI() bool`

HasLogoURI returns a boolean if a field has been set.

### GetTags

`func (o *TransactRequestFromToken) GetTags() []string`

GetTags returns the Tags field if non-nil, zero value otherwise.

### GetTagsOk

`func (o *TransactRequestFromToken) GetTagsOk() (*[]string, bool)`

GetTagsOk returns a tuple with the Tags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTags

`func (o *TransactRequestFromToken) SetTags(v []string)`

SetTags sets Tags field to given value.

### HasTags

`func (o *TransactRequestFromToken) HasTags() bool`

HasTags returns a boolean if a field has been set.

### GetPriceUSD

`func (o *TransactRequestFromToken) GetPriceUSD() string`

GetPriceUSD returns the PriceUSD field if non-nil, zero value otherwise.

### GetPriceUSDOk

`func (o *TransactRequestFromToken) GetPriceUSDOk() (*string, bool)`

GetPriceUSDOk returns a tuple with the PriceUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPriceUSD

`func (o *TransactRequestFromToken) SetPriceUSD(v string)`

SetPriceUSD sets PriceUSD field to given value.

### HasPriceUSD

`func (o *TransactRequestFromToken) HasPriceUSD() bool`

HasPriceUSD returns a boolean if a field has been set.

### GetExtensions

`func (o *TransactRequestFromToken) GetExtensions() TransactRequestFromTokenExtensions`

GetExtensions returns the Extensions field if non-nil, zero value otherwise.

### GetExtensionsOk

`func (o *TransactRequestFromToken) GetExtensionsOk() (*TransactRequestFromTokenExtensions, bool)`

GetExtensionsOk returns a tuple with the Extensions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExtensions

`func (o *TransactRequestFromToken) SetExtensions(v TransactRequestFromTokenExtensions)`

SetExtensions sets Extensions field to given value.

### HasExtensions

`func (o *TransactRequestFromToken) HasExtensions() bool`

HasExtensions returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


