# GetRoutes200ResponseRoutesInnerStepsInnerEstimate

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

### NewGetRoutes200ResponseRoutesInnerStepsInnerEstimate

`func NewGetRoutes200ResponseRoutesInnerStepsInnerEstimate() *GetRoutes200ResponseRoutesInnerStepsInnerEstimate`

NewGetRoutes200ResponseRoutesInnerStepsInnerEstimate instantiates a new GetRoutes200ResponseRoutesInnerStepsInnerEstimate object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetRoutes200ResponseRoutesInnerStepsInnerEstimateWithDefaults

`func NewGetRoutes200ResponseRoutesInnerStepsInnerEstimateWithDefaults() *GetRoutes200ResponseRoutesInnerStepsInnerEstimate`

NewGetRoutes200ResponseRoutesInnerStepsInnerEstimateWithDefaults instantiates a new GetRoutes200ResponseRoutesInnerStepsInnerEstimate object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetApprovalAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetApprovalAddress() string`

GetApprovalAddress returns the ApprovalAddress field if non-nil, zero value otherwise.

### GetApprovalAddressOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetApprovalAddressOk() (*string, bool)`

GetApprovalAddressOk returns a tuple with the ApprovalAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetApprovalAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetApprovalAddress(v string)`

SetApprovalAddress sets ApprovalAddress field to given value.

### HasApprovalAddress

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasApprovalAddress() bool`

HasApprovalAddress returns a boolean if a field has been set.

### GetToAmountMin

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetToAmountMin() string`

GetToAmountMin returns the ToAmountMin field if non-nil, zero value otherwise.

### GetToAmountMinOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetToAmountMinOk() (*string, bool)`

GetToAmountMinOk returns a tuple with the ToAmountMin field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmountMin

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetToAmountMin(v string)`

SetToAmountMin sets ToAmountMin field to given value.

### HasToAmountMin

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasToAmountMin() bool`

HasToAmountMin returns a boolean if a field has been set.

### GetToAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetToAmount() string`

GetToAmount returns the ToAmount field if non-nil, zero value otherwise.

### GetToAmountOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetToAmountOk() (*string, bool)`

GetToAmountOk returns a tuple with the ToAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetToAmount(v string)`

SetToAmount sets ToAmount field to given value.

### HasToAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasToAmount() bool`

HasToAmount returns a boolean if a field has been set.

### GetFromAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetFromAmount() string`

GetFromAmount returns the FromAmount field if non-nil, zero value otherwise.

### GetFromAmountOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetFromAmountOk() (*string, bool)`

GetFromAmountOk returns a tuple with the FromAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetFromAmount(v string)`

SetFromAmount sets FromAmount field to given value.

### HasFromAmount

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasFromAmount() bool`

HasFromAmount returns a boolean if a field has been set.

### GetFeeCosts

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetFeeCosts() []GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner`

GetFeeCosts returns the FeeCosts field if non-nil, zero value otherwise.

### GetFeeCostsOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetFeeCostsOk() (*[]GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner, bool)`

GetFeeCostsOk returns a tuple with the FeeCosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeeCosts

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetFeeCosts(v []GetRoutes200ResponseRoutesInnerStepsInnerEstimateFeeCostsInner)`

SetFeeCosts sets FeeCosts field to given value.

### HasFeeCosts

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasFeeCosts() bool`

HasFeeCosts returns a boolean if a field has been set.

### GetGasCosts

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetGasCosts() []GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner`

GetGasCosts returns the GasCosts field if non-nil, zero value otherwise.

### GetGasCostsOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetGasCostsOk() (*[]GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner, bool)`

GetGasCostsOk returns a tuple with the GasCosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGasCosts

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetGasCosts(v []GetRoutes200ResponseRoutesInnerStepsInnerEstimateGasCostsInner)`

SetGasCosts sets GasCosts field to given value.

### HasGasCosts

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasGasCosts() bool`

HasGasCosts returns a boolean if a field has been set.

### GetExecutionDuration

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetExecutionDuration() int32`

GetExecutionDuration returns the ExecutionDuration field if non-nil, zero value otherwise.

### GetExecutionDurationOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetExecutionDurationOk() (*int32, bool)`

GetExecutionDurationOk returns a tuple with the ExecutionDuration field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExecutionDuration

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetExecutionDuration(v int32)`

SetExecutionDuration sets ExecutionDuration field to given value.

### HasExecutionDuration

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasExecutionDuration() bool`

HasExecutionDuration returns a boolean if a field has been set.

### GetFromAmountUSD

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetFromAmountUSD() string`

GetFromAmountUSD returns the FromAmountUSD field if non-nil, zero value otherwise.

### GetFromAmountUSDOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetFromAmountUSDOk() (*string, bool)`

GetFromAmountUSDOk returns a tuple with the FromAmountUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmountUSD

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetFromAmountUSD(v string)`

SetFromAmountUSD sets FromAmountUSD field to given value.

### HasFromAmountUSD

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasFromAmountUSD() bool`

HasFromAmountUSD returns a boolean if a field has been set.

### GetToAmountUSD

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetToAmountUSD() string`

GetToAmountUSD returns the ToAmountUSD field if non-nil, zero value otherwise.

### GetToAmountUSDOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetToAmountUSDOk() (*string, bool)`

GetToAmountUSDOk returns a tuple with the ToAmountUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmountUSD

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetToAmountUSD(v string)`

SetToAmountUSD sets ToAmountUSD field to given value.

### HasToAmountUSD

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasToAmountUSD() bool`

HasToAmountUSD returns a boolean if a field has been set.

### GetTool

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetTool() string`

GetTool returns the Tool field if non-nil, zero value otherwise.

### GetToolOk

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) GetToolOk() (*string, bool)`

GetToolOk returns a tuple with the Tool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTool

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) SetTool(v string)`

SetTool sets Tool field to given value.

### HasTool

`func (o *GetRoutes200ResponseRoutesInnerStepsInnerEstimate) HasTool() bool`

HasTool returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


