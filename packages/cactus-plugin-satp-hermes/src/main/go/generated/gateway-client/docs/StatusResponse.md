# StatusResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Status** | **string** |  | 
**Substatus** | **string** |  | 
**Stage** | **string** |  | 
**Step** | **string** |  | 
**StartTime** | **time.Time** |  | 
**OriginNetwork** | [**Transact200ResponseStatusResponseOriginNetwork**](Transact200ResponseStatusResponseOriginNetwork.md) |  | 
**DestinationNetwork** | [**Transact200ResponseStatusResponseDestinationNetwork**](Transact200ResponseStatusResponseDestinationNetwork.md) |  | 

## Methods

### NewStatusResponse

`func NewStatusResponse(status string, substatus string, stage string, step string, startTime time.Time, originNetwork Transact200ResponseStatusResponseOriginNetwork, destinationNetwork Transact200ResponseStatusResponseDestinationNetwork, ) *StatusResponse`

NewStatusResponse instantiates a new StatusResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewStatusResponseWithDefaults

`func NewStatusResponseWithDefaults() *StatusResponse`

NewStatusResponseWithDefaults instantiates a new StatusResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStatus

`func (o *StatusResponse) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *StatusResponse) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *StatusResponse) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetSubstatus

`func (o *StatusResponse) GetSubstatus() string`

GetSubstatus returns the Substatus field if non-nil, zero value otherwise.

### GetSubstatusOk

`func (o *StatusResponse) GetSubstatusOk() (*string, bool)`

GetSubstatusOk returns a tuple with the Substatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSubstatus

`func (o *StatusResponse) SetSubstatus(v string)`

SetSubstatus sets Substatus field to given value.


### GetStage

`func (o *StatusResponse) GetStage() string`

GetStage returns the Stage field if non-nil, zero value otherwise.

### GetStageOk

`func (o *StatusResponse) GetStageOk() (*string, bool)`

GetStageOk returns a tuple with the Stage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStage

`func (o *StatusResponse) SetStage(v string)`

SetStage sets Stage field to given value.


### GetStep

`func (o *StatusResponse) GetStep() string`

GetStep returns the Step field if non-nil, zero value otherwise.

### GetStepOk

`func (o *StatusResponse) GetStepOk() (*string, bool)`

GetStepOk returns a tuple with the Step field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStep

`func (o *StatusResponse) SetStep(v string)`

SetStep sets Step field to given value.


### GetStartTime

`func (o *StatusResponse) GetStartTime() time.Time`

GetStartTime returns the StartTime field if non-nil, zero value otherwise.

### GetStartTimeOk

`func (o *StatusResponse) GetStartTimeOk() (*time.Time, bool)`

GetStartTimeOk returns a tuple with the StartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTime

`func (o *StatusResponse) SetStartTime(v time.Time)`

SetStartTime sets StartTime field to given value.


### GetOriginNetwork

`func (o *StatusResponse) GetOriginNetwork() Transact200ResponseStatusResponseOriginNetwork`

GetOriginNetwork returns the OriginNetwork field if non-nil, zero value otherwise.

### GetOriginNetworkOk

`func (o *StatusResponse) GetOriginNetworkOk() (*Transact200ResponseStatusResponseOriginNetwork, bool)`

GetOriginNetworkOk returns a tuple with the OriginNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginNetwork

`func (o *StatusResponse) SetOriginNetwork(v Transact200ResponseStatusResponseOriginNetwork)`

SetOriginNetwork sets OriginNetwork field to given value.


### GetDestinationNetwork

`func (o *StatusResponse) GetDestinationNetwork() Transact200ResponseStatusResponseDestinationNetwork`

GetDestinationNetwork returns the DestinationNetwork field if non-nil, zero value otherwise.

### GetDestinationNetworkOk

`func (o *StatusResponse) GetDestinationNetworkOk() (*Transact200ResponseStatusResponseDestinationNetwork, bool)`

GetDestinationNetworkOk returns a tuple with the DestinationNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationNetwork

`func (o *StatusResponse) SetDestinationNetwork(v Transact200ResponseStatusResponseDestinationNetwork)`

SetDestinationNetwork sets DestinationNetwork field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


