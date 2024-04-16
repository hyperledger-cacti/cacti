# IncludedStep

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** | Id of the step | [optional] 
**Type** | Pointer to **string** | Type of the step, typically describing the action, e.g., &#39;swap&#39;. | [optional] 
**Tool** | Pointer to **string** | Tool used in the step, e.g., &#39;stargate&#39;. | [optional] 
**Action** | Pointer to [**GetRoutes200ResponseRoutesInnerStepsInnerAction**](GetRoutes200ResponseRoutesInnerStepsInnerAction.md) |  | [optional] 
**Estimate** | Pointer to [**GetRoutes200ResponseRoutesInnerStepsInnerEstimate**](GetRoutes200ResponseRoutesInnerStepsInnerEstimate.md) |  | [optional] 
**ToolDetails** | Pointer to [**GetRoutes200ResponseRoutesInnerStepsInnerToolDetails**](GetRoutes200ResponseRoutesInnerStepsInnerToolDetails.md) |  | [optional] 
**IntegrationDetails** | Pointer to [**GetRoutes200ResponseRoutesInnerStepsInnerToolDetails**](GetRoutes200ResponseRoutesInnerStepsInnerToolDetails.md) |  | [optional] 
**IncludedStepIds** | Pointer to **[]string** | IDs of further steps included within this step, allowing for nested actions without direct recursion. | [optional] 

## Methods

### NewIncludedStep

`func NewIncludedStep() *IncludedStep`

NewIncludedStep instantiates a new IncludedStep object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewIncludedStepWithDefaults

`func NewIncludedStepWithDefaults() *IncludedStep`

NewIncludedStepWithDefaults instantiates a new IncludedStep object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *IncludedStep) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *IncludedStep) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *IncludedStep) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *IncludedStep) HasId() bool`

HasId returns a boolean if a field has been set.

### GetType

`func (o *IncludedStep) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *IncludedStep) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *IncludedStep) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *IncludedStep) HasType() bool`

HasType returns a boolean if a field has been set.

### GetTool

`func (o *IncludedStep) GetTool() string`

GetTool returns the Tool field if non-nil, zero value otherwise.

### GetToolOk

`func (o *IncludedStep) GetToolOk() (*string, bool)`

GetToolOk returns a tuple with the Tool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTool

`func (o *IncludedStep) SetTool(v string)`

SetTool sets Tool field to given value.

### HasTool

`func (o *IncludedStep) HasTool() bool`

HasTool returns a boolean if a field has been set.

### GetAction

`func (o *IncludedStep) GetAction() GetRoutes200ResponseRoutesInnerStepsInnerAction`

GetAction returns the Action field if non-nil, zero value otherwise.

### GetActionOk

`func (o *IncludedStep) GetActionOk() (*GetRoutes200ResponseRoutesInnerStepsInnerAction, bool)`

GetActionOk returns a tuple with the Action field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAction

`func (o *IncludedStep) SetAction(v GetRoutes200ResponseRoutesInnerStepsInnerAction)`

SetAction sets Action field to given value.

### HasAction

`func (o *IncludedStep) HasAction() bool`

HasAction returns a boolean if a field has been set.

### GetEstimate

`func (o *IncludedStep) GetEstimate() GetRoutes200ResponseRoutesInnerStepsInnerEstimate`

GetEstimate returns the Estimate field if non-nil, zero value otherwise.

### GetEstimateOk

`func (o *IncludedStep) GetEstimateOk() (*GetRoutes200ResponseRoutesInnerStepsInnerEstimate, bool)`

GetEstimateOk returns a tuple with the Estimate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEstimate

`func (o *IncludedStep) SetEstimate(v GetRoutes200ResponseRoutesInnerStepsInnerEstimate)`

SetEstimate sets Estimate field to given value.

### HasEstimate

`func (o *IncludedStep) HasEstimate() bool`

HasEstimate returns a boolean if a field has been set.

### GetToolDetails

`func (o *IncludedStep) GetToolDetails() GetRoutes200ResponseRoutesInnerStepsInnerToolDetails`

GetToolDetails returns the ToolDetails field if non-nil, zero value otherwise.

### GetToolDetailsOk

`func (o *IncludedStep) GetToolDetailsOk() (*GetRoutes200ResponseRoutesInnerStepsInnerToolDetails, bool)`

GetToolDetailsOk returns a tuple with the ToolDetails field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToolDetails

`func (o *IncludedStep) SetToolDetails(v GetRoutes200ResponseRoutesInnerStepsInnerToolDetails)`

SetToolDetails sets ToolDetails field to given value.

### HasToolDetails

`func (o *IncludedStep) HasToolDetails() bool`

HasToolDetails returns a boolean if a field has been set.

### GetIntegrationDetails

`func (o *IncludedStep) GetIntegrationDetails() GetRoutes200ResponseRoutesInnerStepsInnerToolDetails`

GetIntegrationDetails returns the IntegrationDetails field if non-nil, zero value otherwise.

### GetIntegrationDetailsOk

`func (o *IncludedStep) GetIntegrationDetailsOk() (*GetRoutes200ResponseRoutesInnerStepsInnerToolDetails, bool)`

GetIntegrationDetailsOk returns a tuple with the IntegrationDetails field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIntegrationDetails

`func (o *IncludedStep) SetIntegrationDetails(v GetRoutes200ResponseRoutesInnerStepsInnerToolDetails)`

SetIntegrationDetails sets IntegrationDetails field to given value.

### HasIntegrationDetails

`func (o *IncludedStep) HasIntegrationDetails() bool`

HasIntegrationDetails returns a boolean if a field has been set.

### GetIncludedStepIds

`func (o *IncludedStep) GetIncludedStepIds() []string`

GetIncludedStepIds returns the IncludedStepIds field if non-nil, zero value otherwise.

### GetIncludedStepIdsOk

`func (o *IncludedStep) GetIncludedStepIdsOk() (*[]string, bool)`

GetIncludedStepIdsOk returns a tuple with the IncludedStepIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIncludedStepIds

`func (o *IncludedStep) SetIncludedStepIds(v []string)`

SetIncludedStepIds sets IncludedStepIds field to given value.

### HasIncludedStepIds

`func (o *IncludedStep) HasIncludedStepIds() bool`

HasIncludedStepIds returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


