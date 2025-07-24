# Transact200ResponseStatusResponse

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

### NewTransact200ResponseStatusResponse

`func NewTransact200ResponseStatusResponse(status string, substatus string, stage string, step string, startTime time.Time, originNetwork Transact200ResponseStatusResponseOriginNetwork, destinationNetwork Transact200ResponseStatusResponseDestinationNetwork, ) *Transact200ResponseStatusResponse`

NewTransact200ResponseStatusResponse instantiates a new Transact200ResponseStatusResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransact200ResponseStatusResponseWithDefaults

`func NewTransact200ResponseStatusResponseWithDefaults() *Transact200ResponseStatusResponse`

NewTransact200ResponseStatusResponseWithDefaults instantiates a new Transact200ResponseStatusResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStatus

`func (o *Transact200ResponseStatusResponse) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *Transact200ResponseStatusResponse) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *Transact200ResponseStatusResponse) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetSubstatus

`func (o *Transact200ResponseStatusResponse) GetSubstatus() string`

GetSubstatus returns the Substatus field if non-nil, zero value otherwise.

### GetSubstatusOk

`func (o *Transact200ResponseStatusResponse) GetSubstatusOk() (*string, bool)`

GetSubstatusOk returns a tuple with the Substatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSubstatus

`func (o *Transact200ResponseStatusResponse) SetSubstatus(v string)`

SetSubstatus sets Substatus field to given value.


### GetStage

`func (o *Transact200ResponseStatusResponse) GetStage() string`

GetStage returns the Stage field if non-nil, zero value otherwise.

### GetStageOk

`func (o *Transact200ResponseStatusResponse) GetStageOk() (*string, bool)`

GetStageOk returns a tuple with the Stage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStage

`func (o *Transact200ResponseStatusResponse) SetStage(v string)`

SetStage sets Stage field to given value.


### GetStep

`func (o *Transact200ResponseStatusResponse) GetStep() string`

GetStep returns the Step field if non-nil, zero value otherwise.

### GetStepOk

`func (o *Transact200ResponseStatusResponse) GetStepOk() (*string, bool)`

GetStepOk returns a tuple with the Step field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStep

`func (o *Transact200ResponseStatusResponse) SetStep(v string)`

SetStep sets Step field to given value.


### GetStartTime

`func (o *Transact200ResponseStatusResponse) GetStartTime() time.Time`

GetStartTime returns the StartTime field if non-nil, zero value otherwise.

### GetStartTimeOk

`func (o *Transact200ResponseStatusResponse) GetStartTimeOk() (*time.Time, bool)`

GetStartTimeOk returns a tuple with the StartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTime

`func (o *Transact200ResponseStatusResponse) SetStartTime(v time.Time)`

SetStartTime sets StartTime field to given value.


### GetOriginNetwork

`func (o *Transact200ResponseStatusResponse) GetOriginNetwork() Transact200ResponseStatusResponseOriginNetwork`

GetOriginNetwork returns the OriginNetwork field if non-nil, zero value otherwise.

### GetOriginNetworkOk

`func (o *Transact200ResponseStatusResponse) GetOriginNetworkOk() (*Transact200ResponseStatusResponseOriginNetwork, bool)`

GetOriginNetworkOk returns a tuple with the OriginNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginNetwork

`func (o *Transact200ResponseStatusResponse) SetOriginNetwork(v Transact200ResponseStatusResponseOriginNetwork)`

SetOriginNetwork sets OriginNetwork field to given value.


### GetDestinationNetwork

`func (o *Transact200ResponseStatusResponse) GetDestinationNetwork() Transact200ResponseStatusResponseDestinationNetwork`

GetDestinationNetwork returns the DestinationNetwork field if non-nil, zero value otherwise.

### GetDestinationNetworkOk

`func (o *Transact200ResponseStatusResponse) GetDestinationNetworkOk() (*Transact200ResponseStatusResponseDestinationNetwork, bool)`

GetDestinationNetworkOk returns a tuple with the DestinationNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationNetwork

`func (o *Transact200ResponseStatusResponse) SetDestinationNetwork(v Transact200ResponseStatusResponseDestinationNetwork)`

SetDestinationNetwork sets DestinationNetwork field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


