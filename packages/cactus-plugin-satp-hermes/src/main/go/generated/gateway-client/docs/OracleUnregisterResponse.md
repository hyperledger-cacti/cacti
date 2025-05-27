# OracleUnregisterResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskID** | Pointer to **string** | Unique identifier (UUID) for the session. | [optional] 
**Status** | Pointer to **string** |  | [optional] 

## Methods

### NewOracleUnregisterResponse

`func NewOracleUnregisterResponse() *OracleUnregisterResponse`

NewOracleUnregisterResponse instantiates a new OracleUnregisterResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleUnregisterResponseWithDefaults

`func NewOracleUnregisterResponseWithDefaults() *OracleUnregisterResponse`

NewOracleUnregisterResponseWithDefaults instantiates a new OracleUnregisterResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskID

`func (o *OracleUnregisterResponse) GetTaskID() string`

GetTaskID returns the TaskID field if non-nil, zero value otherwise.

### GetTaskIDOk

`func (o *OracleUnregisterResponse) GetTaskIDOk() (*string, bool)`

GetTaskIDOk returns a tuple with the TaskID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskID

`func (o *OracleUnregisterResponse) SetTaskID(v string)`

SetTaskID sets TaskID field to given value.

### HasTaskID

`func (o *OracleUnregisterResponse) HasTaskID() bool`

HasTaskID returns a boolean if a field has been set.

### GetStatus

`func (o *OracleUnregisterResponse) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleUnregisterResponse) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleUnregisterResponse) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *OracleUnregisterResponse) HasStatus() bool`

HasStatus returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


