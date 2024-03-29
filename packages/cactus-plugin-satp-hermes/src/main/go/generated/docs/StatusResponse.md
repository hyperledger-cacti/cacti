# StatusResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Status** | **string** |  | 
**Substatus** | **string** |  | 
**Stage** | **string** |  | 
**Step** | **string** |  | 
**StartTime** | **time.Time** |  | 
**OriginChain** | [**Transact200ResponseStatusResponseOriginChain**](Transact200ResponseStatusResponseOriginChain.md) |  | 
**DestinationChain** | [**Transact200ResponseStatusResponseDestinationChain**](Transact200ResponseStatusResponseDestinationChain.md) |  | 

## Methods

### NewStatusResponse

`func NewStatusResponse(status string, substatus string, stage string, step string, startTime time.Time, originChain Transact200ResponseStatusResponseOriginChain, destinationChain Transact200ResponseStatusResponseDestinationChain, ) *StatusResponse`

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


### GetOriginChain

`func (o *StatusResponse) GetOriginChain() Transact200ResponseStatusResponseOriginChain`

GetOriginChain returns the OriginChain field if non-nil, zero value otherwise.

### GetOriginChainOk

`func (o *StatusResponse) GetOriginChainOk() (*Transact200ResponseStatusResponseOriginChain, bool)`

GetOriginChainOk returns a tuple with the OriginChain field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginChain

`func (o *StatusResponse) SetOriginChain(v Transact200ResponseStatusResponseOriginChain)`

SetOriginChain sets OriginChain field to given value.


### GetDestinationChain

`func (o *StatusResponse) GetDestinationChain() Transact200ResponseStatusResponseDestinationChain`

GetDestinationChain returns the DestinationChain field if non-nil, zero value otherwise.

### GetDestinationChainOk

`func (o *StatusResponse) GetDestinationChainOk() (*Transact200ResponseStatusResponseDestinationChain, bool)`

GetDestinationChainOk returns a tuple with the DestinationChain field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationChain

`func (o *StatusResponse) SetDestinationChain(v Transact200ResponseStatusResponseDestinationChain)`

SetDestinationChain sets DestinationChain field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


