# OracleRegisterRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DestinationNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SourceContract** | Pointer to [**RegisterOracleTaskRequestSourceContract**](RegisterOracleTaskRequestSourceContract.md) |  | [optional] 
**DestinationContract** | Pointer to [**RegisterOracleTaskRequestDestinationContract**](RegisterOracleTaskRequestDestinationContract.md) |  | [optional] 
**TaskMode** | **string** | The mode of operation for the repeatable task. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 
**ListeningOptions** | Pointer to [**RegisterOracleTaskRequestListeningOptions**](RegisterOracleTaskRequestListeningOptions.md) |  | [optional] 
**TaskType** | **string** | The type of task to be registered. | 

## Methods

### NewOracleRegisterRequest

`func NewOracleRegisterRequest(taskMode string, taskType string, ) *OracleRegisterRequest`

NewOracleRegisterRequest instantiates a new OracleRegisterRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequestWithDefaults

`func NewOracleRegisterRequestWithDefaults() *OracleRegisterRequest`

NewOracleRegisterRequestWithDefaults instantiates a new OracleRegisterRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceNetworkId

`func (o *OracleRegisterRequest) GetSourceNetworkId() TransactRequestSourceAssetNetworkId`

GetSourceNetworkId returns the SourceNetworkId field if non-nil, zero value otherwise.

### GetSourceNetworkIdOk

`func (o *OracleRegisterRequest) GetSourceNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSourceNetworkIdOk returns a tuple with the SourceNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceNetworkId

`func (o *OracleRegisterRequest) SetSourceNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSourceNetworkId sets SourceNetworkId field to given value.

### HasSourceNetworkId

`func (o *OracleRegisterRequest) HasSourceNetworkId() bool`

HasSourceNetworkId returns a boolean if a field has been set.

### GetDestinationNetworkId

`func (o *OracleRegisterRequest) GetDestinationNetworkId() TransactRequestSourceAssetNetworkId`

GetDestinationNetworkId returns the DestinationNetworkId field if non-nil, zero value otherwise.

### GetDestinationNetworkIdOk

`func (o *OracleRegisterRequest) GetDestinationNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDestinationNetworkIdOk returns a tuple with the DestinationNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationNetworkId

`func (o *OracleRegisterRequest) SetDestinationNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDestinationNetworkId sets DestinationNetworkId field to given value.

### HasDestinationNetworkId

`func (o *OracleRegisterRequest) HasDestinationNetworkId() bool`

HasDestinationNetworkId returns a boolean if a field has been set.

### GetSourceContract

`func (o *OracleRegisterRequest) GetSourceContract() RegisterOracleTaskRequestSourceContract`

GetSourceContract returns the SourceContract field if non-nil, zero value otherwise.

### GetSourceContractOk

`func (o *OracleRegisterRequest) GetSourceContractOk() (*RegisterOracleTaskRequestSourceContract, bool)`

GetSourceContractOk returns a tuple with the SourceContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceContract

`func (o *OracleRegisterRequest) SetSourceContract(v RegisterOracleTaskRequestSourceContract)`

SetSourceContract sets SourceContract field to given value.

### HasSourceContract

`func (o *OracleRegisterRequest) HasSourceContract() bool`

HasSourceContract returns a boolean if a field has been set.

### GetDestinationContract

`func (o *OracleRegisterRequest) GetDestinationContract() RegisterOracleTaskRequestDestinationContract`

GetDestinationContract returns the DestinationContract field if non-nil, zero value otherwise.

### GetDestinationContractOk

`func (o *OracleRegisterRequest) GetDestinationContractOk() (*RegisterOracleTaskRequestDestinationContract, bool)`

GetDestinationContractOk returns a tuple with the DestinationContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationContract

`func (o *OracleRegisterRequest) SetDestinationContract(v RegisterOracleTaskRequestDestinationContract)`

SetDestinationContract sets DestinationContract field to given value.

### HasDestinationContract

`func (o *OracleRegisterRequest) HasDestinationContract() bool`

HasDestinationContract returns a boolean if a field has been set.

### GetTaskMode

`func (o *OracleRegisterRequest) GetTaskMode() string`

GetTaskMode returns the TaskMode field if non-nil, zero value otherwise.

### GetTaskModeOk

`func (o *OracleRegisterRequest) GetTaskModeOk() (*string, bool)`

GetTaskModeOk returns a tuple with the TaskMode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskMode

`func (o *OracleRegisterRequest) SetTaskMode(v string)`

SetTaskMode sets TaskMode field to given value.


### GetPollingInterval

`func (o *OracleRegisterRequest) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *OracleRegisterRequest) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *OracleRegisterRequest) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *OracleRegisterRequest) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.

### GetListeningOptions

`func (o *OracleRegisterRequest) GetListeningOptions() RegisterOracleTaskRequestListeningOptions`

GetListeningOptions returns the ListeningOptions field if non-nil, zero value otherwise.

### GetListeningOptionsOk

`func (o *OracleRegisterRequest) GetListeningOptionsOk() (*RegisterOracleTaskRequestListeningOptions, bool)`

GetListeningOptionsOk returns a tuple with the ListeningOptions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetListeningOptions

`func (o *OracleRegisterRequest) SetListeningOptions(v RegisterOracleTaskRequestListeningOptions)`

SetListeningOptions sets ListeningOptions field to given value.

### HasListeningOptions

`func (o *OracleRegisterRequest) HasListeningOptions() bool`

HasListeningOptions returns a boolean if a field has been set.

### GetTaskType

`func (o *OracleRegisterRequest) GetTaskType() string`

GetTaskType returns the TaskType field if non-nil, zero value otherwise.

### GetTaskTypeOk

`func (o *OracleRegisterRequest) GetTaskTypeOk() (*string, bool)`

GetTaskTypeOk returns a tuple with the TaskType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskType

`func (o *OracleRegisterRequest) SetTaskType(v string)`

SetTaskType sets TaskType field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


