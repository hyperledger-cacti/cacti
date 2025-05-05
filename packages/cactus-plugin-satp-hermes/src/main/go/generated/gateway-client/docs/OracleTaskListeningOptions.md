# OracleTaskListeningOptions

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EventSignature** | Pointer to **string** | The event signature to listen for on the source network. Only if taskMode is EVENT_LISTENING. | [optional] 
**FilterParams** | Pointer to **[]string** | The parameters to filter in the captured events. | [optional] 

## Methods

### NewOracleTaskListeningOptions

`func NewOracleTaskListeningOptions() *OracleTaskListeningOptions`

NewOracleTaskListeningOptions instantiates a new OracleTaskListeningOptions object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleTaskListeningOptionsWithDefaults

`func NewOracleTaskListeningOptionsWithDefaults() *OracleTaskListeningOptions`

NewOracleTaskListeningOptionsWithDefaults instantiates a new OracleTaskListeningOptions object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEventSignature

`func (o *OracleTaskListeningOptions) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *OracleTaskListeningOptions) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *OracleTaskListeningOptions) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *OracleTaskListeningOptions) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.

### GetFilterParams

`func (o *OracleTaskListeningOptions) GetFilterParams() []string`

GetFilterParams returns the FilterParams field if non-nil, zero value otherwise.

### GetFilterParamsOk

`func (o *OracleTaskListeningOptions) GetFilterParamsOk() (*[]string, bool)`

GetFilterParamsOk returns a tuple with the FilterParams field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFilterParams

`func (o *OracleTaskListeningOptions) SetFilterParams(v []string)`

SetFilterParams sets FilterParams field to given value.

### HasFilterParams

`func (o *OracleTaskListeningOptions) HasFilterParams() bool`

HasFilterParams returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


