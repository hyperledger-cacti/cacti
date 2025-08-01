# OracleRepeatableTaskAllOf1

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskMode** | Pointer to [**Enum**](enum.md) | The mode of operation for the repeatable task. | [optional] 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. | [optional] 
**SourceEventSignature** | Pointer to **string** | The event signature to listen for on the source network. | [optional] 

## Methods

### NewOracleRepeatableTaskAllOf1

`func NewOracleRepeatableTaskAllOf1() *OracleRepeatableTaskAllOf1`

NewOracleRepeatableTaskAllOf1 instantiates a new OracleRepeatableTaskAllOf1 object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRepeatableTaskAllOf1WithDefaults

`func NewOracleRepeatableTaskAllOf1WithDefaults() *OracleRepeatableTaskAllOf1`

NewOracleRepeatableTaskAllOf1WithDefaults instantiates a new OracleRepeatableTaskAllOf1 object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskMode

`func (o *OracleRepeatableTaskAllOf1) GetTaskMode() Enum`

GetTaskMode returns the TaskMode field if non-nil, zero value otherwise.

### GetTaskModeOk

`func (o *OracleRepeatableTaskAllOf1) GetTaskModeOk() (*Enum, bool)`

GetTaskModeOk returns a tuple with the TaskMode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskMode

`func (o *OracleRepeatableTaskAllOf1) SetTaskMode(v Enum)`

SetTaskMode sets TaskMode field to given value.

### HasTaskMode

`func (o *OracleRepeatableTaskAllOf1) HasTaskMode() bool`

HasTaskMode returns a boolean if a field has been set.

### GetPollingInterval

`func (o *OracleRepeatableTaskAllOf1) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *OracleRepeatableTaskAllOf1) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *OracleRepeatableTaskAllOf1) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *OracleRepeatableTaskAllOf1) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.

### GetSourceEventSignature

`func (o *OracleRepeatableTaskAllOf1) GetSourceEventSignature() string`

GetSourceEventSignature returns the SourceEventSignature field if non-nil, zero value otherwise.

### GetSourceEventSignatureOk

`func (o *OracleRepeatableTaskAllOf1) GetSourceEventSignatureOk() (*string, bool)`

GetSourceEventSignatureOk returns a tuple with the SourceEventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceEventSignature

`func (o *OracleRepeatableTaskAllOf1) SetSourceEventSignature(v string)`

SetSourceEventSignature sets SourceEventSignature field to given value.

### HasSourceEventSignature

`func (o *OracleRepeatableTaskAllOf1) HasSourceEventSignature() bool`

HasSourceEventSignature returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


