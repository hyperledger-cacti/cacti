# OracleRegisterRequestOracleRegisterRequestParameter

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceNetwork** | Pointer to **string** | The source blockchain network identifier. Only if taskType is READ or READ_AND_UPDATE. | [optional] 
**TargetNetwork** | Pointer to **string** | The target blockchain network identifier. Only if taskType is UPDATE or READ_AND_UPDATE. | [optional] 
**OriginContract** | Pointer to **string** | The contract address on the source blockchain. Only if taskType is READ or READ_AND_UPDATE. | [optional] 
**DestinationContract** | Pointer to **string** | The contract address on the destination blockchain. Only if taskType is UPDATE or READ_AND_UPDATE. | [optional] 
**EventSignature** | Pointer to **string** | The signature of the event of interest on the source blockchain. Only if taskType is READ or READ_AND_UPDATE. | [optional] 
**ReadFunction** | Pointer to **string** | The function to be called on the source blockchain. Only if taskType is READ or READ_AND_UPDATE. | [optional] 
**WriteFunction** | Pointer to **string** | The function to be called on the destination blockchain. Only if taskType is UPDATE or READ_AND_UPDATE. | [optional] 
**TaskMode** | **string** | The mode of operation for the task. | 
**TaskInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 
**TaskType** | **string** | The type of task to be registered. | 

## Methods

### NewOracleRegisterRequestOracleRegisterRequestParameter

`func NewOracleRegisterRequestOracleRegisterRequestParameter(taskMode string, taskType string, ) *OracleRegisterRequestOracleRegisterRequestParameter`

NewOracleRegisterRequestOracleRegisterRequestParameter instantiates a new OracleRegisterRequestOracleRegisterRequestParameter object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequestOracleRegisterRequestParameterWithDefaults

`func NewOracleRegisterRequestOracleRegisterRequestParameterWithDefaults() *OracleRegisterRequestOracleRegisterRequestParameter`

NewOracleRegisterRequestOracleRegisterRequestParameterWithDefaults instantiates a new OracleRegisterRequestOracleRegisterRequestParameter object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceNetwork

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetSourceNetwork() string`

GetSourceNetwork returns the SourceNetwork field if non-nil, zero value otherwise.

### GetSourceNetworkOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetSourceNetworkOk() (*string, bool)`

GetSourceNetworkOk returns a tuple with the SourceNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceNetwork

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetSourceNetwork(v string)`

SetSourceNetwork sets SourceNetwork field to given value.

### HasSourceNetwork

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasSourceNetwork() bool`

HasSourceNetwork returns a boolean if a field has been set.

### GetTargetNetwork

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTargetNetwork() string`

GetTargetNetwork returns the TargetNetwork field if non-nil, zero value otherwise.

### GetTargetNetworkOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTargetNetworkOk() (*string, bool)`

GetTargetNetworkOk returns a tuple with the TargetNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTargetNetwork

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetTargetNetwork(v string)`

SetTargetNetwork sets TargetNetwork field to given value.

### HasTargetNetwork

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasTargetNetwork() bool`

HasTargetNetwork returns a boolean if a field has been set.

### GetOriginContract

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetOriginContract() string`

GetOriginContract returns the OriginContract field if non-nil, zero value otherwise.

### GetOriginContractOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetOriginContractOk() (*string, bool)`

GetOriginContractOk returns a tuple with the OriginContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginContract

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetOriginContract(v string)`

SetOriginContract sets OriginContract field to given value.

### HasOriginContract

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasOriginContract() bool`

HasOriginContract returns a boolean if a field has been set.

### GetDestinationContract

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetDestinationContract() string`

GetDestinationContract returns the DestinationContract field if non-nil, zero value otherwise.

### GetDestinationContractOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetDestinationContractOk() (*string, bool)`

GetDestinationContractOk returns a tuple with the DestinationContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationContract

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetDestinationContract(v string)`

SetDestinationContract sets DestinationContract field to given value.

### HasDestinationContract

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasDestinationContract() bool`

HasDestinationContract returns a boolean if a field has been set.

### GetEventSignature

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.

### GetReadFunction

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetReadFunction() string`

GetReadFunction returns the ReadFunction field if non-nil, zero value otherwise.

### GetReadFunctionOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetReadFunctionOk() (*string, bool)`

GetReadFunctionOk returns a tuple with the ReadFunction field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReadFunction

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetReadFunction(v string)`

SetReadFunction sets ReadFunction field to given value.

### HasReadFunction

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasReadFunction() bool`

HasReadFunction returns a boolean if a field has been set.

### GetWriteFunction

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetWriteFunction() string`

GetWriteFunction returns the WriteFunction field if non-nil, zero value otherwise.

### GetWriteFunctionOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetWriteFunctionOk() (*string, bool)`

GetWriteFunctionOk returns a tuple with the WriteFunction field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWriteFunction

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetWriteFunction(v string)`

SetWriteFunction sets WriteFunction field to given value.

### HasWriteFunction

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasWriteFunction() bool`

HasWriteFunction returns a boolean if a field has been set.

### GetTaskMode

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTaskMode() string`

GetTaskMode returns the TaskMode field if non-nil, zero value otherwise.

### GetTaskModeOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTaskModeOk() (*string, bool)`

GetTaskModeOk returns a tuple with the TaskMode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskMode

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetTaskMode(v string)`

SetTaskMode sets TaskMode field to given value.


### GetTaskInterval

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTaskInterval() int32`

GetTaskInterval returns the TaskInterval field if non-nil, zero value otherwise.

### GetTaskIntervalOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTaskIntervalOk() (*int32, bool)`

GetTaskIntervalOk returns a tuple with the TaskInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskInterval

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetTaskInterval(v int32)`

SetTaskInterval sets TaskInterval field to given value.

### HasTaskInterval

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) HasTaskInterval() bool`

HasTaskInterval returns a boolean if a field has been set.

### GetTaskType

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTaskType() string`

GetTaskType returns the TaskType field if non-nil, zero value otherwise.

### GetTaskTypeOk

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) GetTaskTypeOk() (*string, bool)`

GetTaskTypeOk returns a tuple with the TaskType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskType

`func (o *OracleRegisterRequestOracleRegisterRequestParameter) SetTaskType(v string)`

SetTaskType sets TaskType field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


