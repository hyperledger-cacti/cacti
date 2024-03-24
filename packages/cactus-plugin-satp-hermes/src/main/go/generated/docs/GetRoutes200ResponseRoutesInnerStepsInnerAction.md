# GetRoutes200ResponseRoutesInnerStepsInnerAction

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

### NewGetRoutes200ResponseRoutesInnerStepsInnerAction

`func NewGetRoutes200ResponseRoutesInnerStepsInnerAction() *GetRoutes200ResponseRoutesInnerStepsInnerAction`

NewGetRoutes200ResponseRoutesInnerStepsInnerAction instantiates a new GetRoutes200ResponseRoutesInnerStepsInnerAction object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetRoutes200ResponseRoutesInnerStepsInnerActionWithDefaults

`func NewGetRoutes200ResponseRoutesInnerStepsInnerActionWithDefaults() *GetRoutes200ResponseRoutesInnerStepsInnerAction`

NewGetRoutes200ResponseRoutesInnerStepsInnerActionWithDefaults instantiates a new GetRoutes200ResponseRoutesInnerStepsInnerAction object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFromToken

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetFromToken() GetRoutes200ResponseRoutesInnerFromToken`

GetFromToken returns the FromToken field if non-nil, zero value otherwise.

### GetFromTokenOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetFromTokenOk() (*GetRoutes200ResponseRoutesInnerFromToken, bool)`

GetFromTokenOk returns a tuple with the FromToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromToken

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) SetFromToken(v GetRoutes200ResponseRoutesInnerFromToken)`

SetFromToken sets FromToken field to given value.

### HasFromToken

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) HasFromToken() bool`

HasFromToken returns a boolean if a field has been set.

### GetFromAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetFromAmount() string`

GetFromAmount returns the FromAmount field if non-nil, zero value otherwise.

### GetFromAmountOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetFromAmountOk() (*string, bool)`

GetFromAmountOk returns a tuple with the FromAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) SetFromAmount(v string)`

SetFromAmount sets FromAmount field to given value.

### HasFromAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) HasFromAmount() bool`

HasFromAmount returns a boolean if a field has been set.

### GetToToken

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetToToken() GetRoutes200ResponseRoutesInnerFromToken`

GetToToken returns the ToToken field if non-nil, zero value otherwise.

### GetToTokenOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetToTokenOk() (*GetRoutes200ResponseRoutesInnerFromToken, bool)`

GetToTokenOk returns a tuple with the ToToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToToken

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) SetToToken(v GetRoutes200ResponseRoutesInnerFromToken)`

SetToToken sets ToToken field to given value.

### HasToToken

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) HasToToken() bool`

HasToToken returns a boolean if a field has been set.

### GetSlippage

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetSlippage() float32`

GetSlippage returns the Slippage field if non-nil, zero value otherwise.

### GetSlippageOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetSlippageOk() (*float32, bool)`

GetSlippageOk returns a tuple with the Slippage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlippage

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) SetSlippage(v float32)`

SetSlippage sets Slippage field to given value.

### HasSlippage

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) HasSlippage() bool`

HasSlippage returns a boolean if a field has been set.

### GetFromAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetFromAddress() string`

GetFromAddress returns the FromAddress field if non-nil, zero value otherwise.

### GetFromAddressOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetFromAddressOk() (*string, bool)`

GetFromAddressOk returns a tuple with the FromAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) SetFromAddress(v string)`

SetFromAddress sets FromAddress field to given value.

### HasFromAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) HasFromAddress() bool`

HasFromAddress returns a boolean if a field has been set.

### GetToAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetToAddress() string`

GetToAddress returns the ToAddress field if non-nil, zero value otherwise.

### GetToAddressOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) GetToAddressOk() (*string, bool)`

GetToAddressOk returns a tuple with the ToAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) SetToAddress(v string)`

SetToAddress sets ToAddress field to given value.

### HasToAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerAction) HasToAddress() bool`

HasToAddress returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


