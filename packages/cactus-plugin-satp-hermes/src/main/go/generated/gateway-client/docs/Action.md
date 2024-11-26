# Action

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**FromToken** | Pointer to [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] 
**FromAmount** | Pointer to **string** | The amount of &#39;fromToken&#39; to be transferred, specified as a string to maintain precision. | [optional] 
**ToToken** | Pointer to [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] 
**Slippage** | Pointer to **float32** | The maximum acceptable difference between the expected price of the &#39;toToken&#39; and the price at the time of the transfer. | [optional] 
**FromAddress** | Pointer to **string** | A blockchain address. | [optional] 
**ToAddress** | Pointer to **string** | A blockchain address. | [optional] 

## Methods

### NewAction

`func NewAction() *Action`

NewAction instantiates a new Action object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewActionWithDefaults

`func NewActionWithDefaults() *Action`

NewActionWithDefaults instantiates a new Action object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFromToken

`func (o *Action) GetFromToken() GetRoutes200ResponseRoutesInnerFromToken`

GetFromToken returns the FromToken field if non-nil, zero value otherwise.

### GetFromTokenOk

`func (o *Action) GetFromTokenOk() (*GetRoutes200ResponseRoutesInnerFromToken, bool)`

GetFromTokenOk returns a tuple with the FromToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromToken

`func (o *Action) SetFromToken(v GetRoutes200ResponseRoutesInnerFromToken)`

SetFromToken sets FromToken field to given value.

### HasFromToken

`func (o *Action) HasFromToken() bool`

HasFromToken returns a boolean if a field has been set.

### GetFromAmount

`func (o *Action) GetFromAmount() string`

GetFromAmount returns the FromAmount field if non-nil, zero value otherwise.

### GetFromAmountOk

`func (o *Action) GetFromAmountOk() (*string, bool)`

GetFromAmountOk returns a tuple with the FromAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmount

`func (o *Action) SetFromAmount(v string)`

SetFromAmount sets FromAmount field to given value.

### HasFromAmount

`func (o *Action) HasFromAmount() bool`

HasFromAmount returns a boolean if a field has been set.

### GetToToken

`func (o *Action) GetToToken() GetRoutes200ResponseRoutesInnerFromToken`

GetToToken returns the ToToken field if non-nil, zero value otherwise.

### GetToTokenOk

`func (o *Action) GetToTokenOk() (*GetRoutes200ResponseRoutesInnerFromToken, bool)`

GetToTokenOk returns a tuple with the ToToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToToken

`func (o *Action) SetToToken(v GetRoutes200ResponseRoutesInnerFromToken)`

SetToToken sets ToToken field to given value.

### HasToToken

`func (o *Action) HasToToken() bool`

HasToToken returns a boolean if a field has been set.

### GetSlippage

`func (o *Action) GetSlippage() float32`

GetSlippage returns the Slippage field if non-nil, zero value otherwise.

### GetSlippageOk

`func (o *Action) GetSlippageOk() (*float32, bool)`

GetSlippageOk returns a tuple with the Slippage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlippage

`func (o *Action) SetSlippage(v float32)`

SetSlippage sets Slippage field to given value.

### HasSlippage

`func (o *Action) HasSlippage() bool`

HasSlippage returns a boolean if a field has been set.

### GetFromAddress

`func (o *Action) GetFromAddress() string`

GetFromAddress returns the FromAddress field if non-nil, zero value otherwise.

### GetFromAddressOk

`func (o *Action) GetFromAddressOk() (*string, bool)`

GetFromAddressOk returns a tuple with the FromAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAddress

`func (o *Action) SetFromAddress(v string)`

SetFromAddress sets FromAddress field to given value.

### HasFromAddress

`func (o *Action) HasFromAddress() bool`

HasFromAddress returns a boolean if a field has been set.

### GetToAddress

`func (o *Action) GetToAddress() string`

GetToAddress returns the ToAddress field if non-nil, zero value otherwise.

### GetToAddressOk

`func (o *Action) GetToAddressOk() (*string, bool)`

GetToAddressOk returns a tuple with the ToAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAddress

`func (o *Action) SetToAddress(v string)`

SetToAddress sets ToAddress field to given value.

### HasToAddress

`func (o *Action) HasToAddress() bool`

HasToAddress returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


