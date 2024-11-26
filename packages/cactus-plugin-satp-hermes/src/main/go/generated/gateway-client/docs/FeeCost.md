# FeeCost

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | Pointer to **string** | Name of the fee cost. | [optional] 
**Amount** | Pointer to **string** | The amount in string format including all decimals. | [optional] 
**AmountUSD** | Pointer to **string** | The amount in string format including all decimals. | [optional] 
**Token** | Pointer to **string** | The symbol of a token | [optional] 
**Included** | Pointer to **bool** | Indicates if the fee is included in the transaction amount. | [optional] 

## Methods

### NewFeeCost

`func NewFeeCost() *FeeCost`

NewFeeCost instantiates a new FeeCost object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewFeeCostWithDefaults

`func NewFeeCostWithDefaults() *FeeCost`

NewFeeCostWithDefaults instantiates a new FeeCost object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *FeeCost) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *FeeCost) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *FeeCost) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *FeeCost) HasName() bool`

HasName returns a boolean if a field has been set.

### GetAmount

`func (o *FeeCost) GetAmount() string`

GetAmount returns the Amount field if non-nil, zero value otherwise.

### GetAmountOk

`func (o *FeeCost) GetAmountOk() (*string, bool)`

GetAmountOk returns a tuple with the Amount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmount

`func (o *FeeCost) SetAmount(v string)`

SetAmount sets Amount field to given value.

### HasAmount

`func (o *FeeCost) HasAmount() bool`

HasAmount returns a boolean if a field has been set.

### GetAmountUSD

`func (o *FeeCost) GetAmountUSD() string`

GetAmountUSD returns the AmountUSD field if non-nil, zero value otherwise.

### GetAmountUSDOk

`func (o *FeeCost) GetAmountUSDOk() (*string, bool)`

GetAmountUSDOk returns a tuple with the AmountUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmountUSD

`func (o *FeeCost) SetAmountUSD(v string)`

SetAmountUSD sets AmountUSD field to given value.

### HasAmountUSD

`func (o *FeeCost) HasAmountUSD() bool`

HasAmountUSD returns a boolean if a field has been set.

### GetToken

`func (o *FeeCost) GetToken() string`

GetToken returns the Token field if non-nil, zero value otherwise.

### GetTokenOk

`func (o *FeeCost) GetTokenOk() (*string, bool)`

GetTokenOk returns a tuple with the Token field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToken

`func (o *FeeCost) SetToken(v string)`

SetToken sets Token field to given value.

### HasToken

`func (o *FeeCost) HasToken() bool`

HasToken returns a boolean if a field has been set.

### GetIncluded

`func (o *FeeCost) GetIncluded() bool`

GetIncluded returns the Included field if non-nil, zero value otherwise.

### GetIncludedOk

`func (o *FeeCost) GetIncludedOk() (*bool, bool)`

GetIncludedOk returns a tuple with the Included field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIncluded

`func (o *FeeCost) SetIncluded(v bool)`

SetIncluded sets Included field to given value.

### HasIncluded

`func (o *FeeCost) HasIncluded() bool`

HasIncluded returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


