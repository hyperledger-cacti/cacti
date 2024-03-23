# Insurance

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**State** | Pointer to **string** | The state of insurance applicability for the transaction. | [optional] 
**FeeAmountUsd** | Pointer to **string** | The fee amount for insurance, represented in USD. | [optional] 

## Methods

### NewInsurance

`func NewInsurance() *Insurance`

NewInsurance instantiates a new Insurance object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewInsuranceWithDefaults

`func NewInsuranceWithDefaults() *Insurance`

NewInsuranceWithDefaults instantiates a new Insurance object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetState

`func (o *Insurance) GetState() string`

GetState returns the State field if non-nil, zero value otherwise.

### GetStateOk

`func (o *Insurance) GetStateOk() (*string, bool)`

GetStateOk returns a tuple with the State field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetState

`func (o *Insurance) SetState(v string)`

SetState sets State field to given value.

### HasState

`func (o *Insurance) HasState() bool`

HasState returns a boolean if a field has been set.

### GetFeeAmountUsd

`func (o *Insurance) GetFeeAmountUsd() string`

GetFeeAmountUsd returns the FeeAmountUsd field if non-nil, zero value otherwise.

### GetFeeAmountUsdOk

`func (o *Insurance) GetFeeAmountUsdOk() (*string, bool)`

GetFeeAmountUsdOk returns a tuple with the FeeAmountUsd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeeAmountUsd

`func (o *Insurance) SetFeeAmountUsd(v string)`

SetFeeAmountUsd sets FeeAmountUsd field to given value.

### HasFeeAmountUsd

`func (o *Insurance) HasFeeAmountUsd() bool`

HasFeeAmountUsd returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


