# RegisterOracleTaskRequestListeningOptions

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EventSignature** | **string** | The event signature to listen for on the source network. Only if taskMode is EVENT_LISTENING. | 
**FilterParams** | Pointer to **[]string** | The parameters to filter in the captured events. | [optional] 

## Methods

### NewRegisterOracleTaskRequestListeningOptions

`func NewRegisterOracleTaskRequestListeningOptions(eventSignature string, ) *RegisterOracleTaskRequestListeningOptions`

NewRegisterOracleTaskRequestListeningOptions instantiates a new RegisterOracleTaskRequestListeningOptions object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRegisterOracleTaskRequestListeningOptionsWithDefaults

`func NewRegisterOracleTaskRequestListeningOptionsWithDefaults() *RegisterOracleTaskRequestListeningOptions`

NewRegisterOracleTaskRequestListeningOptionsWithDefaults instantiates a new RegisterOracleTaskRequestListeningOptions object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEventSignature

`func (o *RegisterOracleTaskRequestListeningOptions) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *RegisterOracleTaskRequestListeningOptions) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *RegisterOracleTaskRequestListeningOptions) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.


### GetFilterParams

`func (o *RegisterOracleTaskRequestListeningOptions) GetFilterParams() []string`

GetFilterParams returns the FilterParams field if non-nil, zero value otherwise.

### GetFilterParamsOk

`func (o *RegisterOracleTaskRequestListeningOptions) GetFilterParamsOk() (*[]string, bool)`

GetFilterParamsOk returns a tuple with the FilterParams field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFilterParams

`func (o *RegisterOracleTaskRequestListeningOptions) SetFilterParams(v []string)`

SetFilterParams sets FilterParams field to given value.

### HasFilterParams

`func (o *RegisterOracleTaskRequestListeningOptions) HasFilterParams() bool`

HasFilterParams returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


