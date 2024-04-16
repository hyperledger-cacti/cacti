# Estimate

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ApprovalAddress** | Pointer to **string** | A blockchain address. | [optional] 
**ToAmountMin** | Pointer to **string** | The amount in string format including all decimals. | [optional] 
**ToAmount** | Pointer to **string** | The amount in string format including all decimals. | [optional] 
**FromAmount** | Pointer to **string** | The amount in string format including all decimals. | [optional] 
**FeeCosts** | Pointer to [**[]GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner**](GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner.md) | A collection of fee costs associated with the transaction. | [optional] 
**GasCosts** | Pointer to [**[]GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner**](GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner.md) | A collection of estimated gas costs for executing the transaction. | [optional] 
**ExecutionDuration** | Pointer to **int32** | The estimated duration for the transaction execution in seconds. | [optional] 
**FromAmountUSD** | Pointer to **string** | The amount in string format including all decimals. | [optional] 
**ToAmountUSD** | Pointer to **string** | The amount in string format including all decimals. | [optional] 
**Tool** | Pointer to **string** | The tool or service used to generate this estimate. | [optional] 

## Methods

### NewEstimate

`func NewEstimate() *Estimate`

NewEstimate instantiates a new Estimate object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEstimateWithDefaults

`func NewEstimateWithDefaults() *Estimate`

NewEstimateWithDefaults instantiates a new Estimate object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetApprovalAddress

`func (o *Estimate) GetApprovalAddress() string`

GetApprovalAddress returns the ApprovalAddress field if non-nil, zero value otherwise.

### GetApprovalAddressOk

`func (o *Estimate) GetApprovalAddressOk() (*string, bool)`

GetApprovalAddressOk returns a tuple with the ApprovalAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetApprovalAddress

`func (o *Estimate) SetApprovalAddress(v string)`

SetApprovalAddress sets ApprovalAddress field to given value.

### HasApprovalAddress

`func (o *Estimate) HasApprovalAddress() bool`

HasApprovalAddress returns a boolean if a field has been set.

### GetToAmountMin

`func (o *Estimate) GetToAmountMin() string`

GetToAmountMin returns the ToAmountMin field if non-nil, zero value otherwise.

### GetToAmountMinOk

`func (o *Estimate) GetToAmountMinOk() (*string, bool)`

GetToAmountMinOk returns a tuple with the ToAmountMin field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmountMin

`func (o *Estimate) SetToAmountMin(v string)`

SetToAmountMin sets ToAmountMin field to given value.

### HasToAmountMin

`func (o *Estimate) HasToAmountMin() bool`

HasToAmountMin returns a boolean if a field has been set.

### GetToAmount

`func (o *Estimate) GetToAmount() string`

GetToAmount returns the ToAmount field if non-nil, zero value otherwise.

### GetToAmountOk

`func (o *Estimate) GetToAmountOk() (*string, bool)`

GetToAmountOk returns a tuple with the ToAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmount

`func (o *Estimate) SetToAmount(v string)`

SetToAmount sets ToAmount field to given value.

### HasToAmount

`func (o *Estimate) HasToAmount() bool`

HasToAmount returns a boolean if a field has been set.

### GetFromAmount

`func (o *Estimate) GetFromAmount() string`

GetFromAmount returns the FromAmount field if non-nil, zero value otherwise.

### GetFromAmountOk

`func (o *Estimate) GetFromAmountOk() (*string, bool)`

GetFromAmountOk returns a tuple with the FromAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmount

`func (o *Estimate) SetFromAmount(v string)`

SetFromAmount sets FromAmount field to given value.

### HasFromAmount

`func (o *Estimate) HasFromAmount() bool`

HasFromAmount returns a boolean if a field has been set.

### GetFeeCosts

`func (o *Estimate) GetFeeCosts() []GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner`

GetFeeCosts returns the FeeCosts field if non-nil, zero value otherwise.

### GetFeeCostsOk

`func (o *Estimate) GetFeeCostsOk() (*[]GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner, bool)`

GetFeeCostsOk returns a tuple with the FeeCosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeeCosts

`func (o *Estimate) SetFeeCosts(v []GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner)`

SetFeeCosts sets FeeCosts field to given value.

### HasFeeCosts

`func (o *Estimate) HasFeeCosts() bool`

HasFeeCosts returns a boolean if a field has been set.

### GetGasCosts

`func (o *Estimate) GetGasCosts() []GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner`

GetGasCosts returns the GasCosts field if non-nil, zero value otherwise.

### GetGasCostsOk

`func (o *Estimate) GetGasCostsOk() (*[]GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner, bool)`

GetGasCostsOk returns a tuple with the GasCosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGasCosts

`func (o *Estimate) SetGasCosts(v []GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner)`

SetGasCosts sets GasCosts field to given value.

### HasGasCosts

`func (o *Estimate) HasGasCosts() bool`

HasGasCosts returns a boolean if a field has been set.

### GetExecutionDuration

`func (o *Estimate) GetExecutionDuration() int32`

GetExecutionDuration returns the ExecutionDuration field if non-nil, zero value otherwise.

### GetExecutionDurationOk

`func (o *Estimate) GetExecutionDurationOk() (*int32, bool)`

GetExecutionDurationOk returns a tuple with the ExecutionDuration field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExecutionDuration

`func (o *Estimate) SetExecutionDuration(v int32)`

SetExecutionDuration sets ExecutionDuration field to given value.

### HasExecutionDuration

`func (o *Estimate) HasExecutionDuration() bool`

HasExecutionDuration returns a boolean if a field has been set.

### GetFromAmountUSD

`func (o *Estimate) GetFromAmountUSD() string`

GetFromAmountUSD returns the FromAmountUSD field if non-nil, zero value otherwise.

### GetFromAmountUSDOk

`func (o *Estimate) GetFromAmountUSDOk() (*string, bool)`

GetFromAmountUSDOk returns a tuple with the FromAmountUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmountUSD

`func (o *Estimate) SetFromAmountUSD(v string)`

SetFromAmountUSD sets FromAmountUSD field to given value.

### HasFromAmountUSD

`func (o *Estimate) HasFromAmountUSD() bool`

HasFromAmountUSD returns a boolean if a field has been set.

### GetToAmountUSD

`func (o *Estimate) GetToAmountUSD() string`

GetToAmountUSD returns the ToAmountUSD field if non-nil, zero value otherwise.

### GetToAmountUSDOk

`func (o *Estimate) GetToAmountUSDOk() (*string, bool)`

GetToAmountUSDOk returns a tuple with the ToAmountUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmountUSD

`func (o *Estimate) SetToAmountUSD(v string)`

SetToAmountUSD sets ToAmountUSD field to given value.

### HasToAmountUSD

`func (o *Estimate) HasToAmountUSD() bool`

HasToAmountUSD returns a boolean if a field has been set.

### GetTool

`func (o *Estimate) GetTool() string`

GetTool returns the Tool field if non-nil, zero value otherwise.

### GetToolOk

`func (o *Estimate) GetToolOk() (*string, bool)`

GetToolOk returns a tuple with the Tool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTool

`func (o *Estimate) SetTool(v string)`

SetTool sets Tool field to given value.

### HasTool

`func (o *Estimate) HasTool() bool`

HasTool returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


