# OracleUnregisterRequest200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskID** | Pointer to **string** | The unique identifier for the context of the data transfer task. | [optional] 
**Status** | Pointer to **string** | The status of the unregistered data transfer task. | [optional] 
**Substatus** | Pointer to **string** |  | [optional] 

## Methods

### NewOracleUnregisterRequest200Response

`func NewOracleUnregisterRequest200Response() *OracleUnregisterRequest200Response`

NewOracleUnregisterRequest200Response instantiates a new OracleUnregisterRequest200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleUnregisterRequest200ResponseWithDefaults

`func NewOracleUnregisterRequest200ResponseWithDefaults() *OracleUnregisterRequest200Response`

NewOracleUnregisterRequest200ResponseWithDefaults instantiates a new OracleUnregisterRequest200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskID

`func (o *OracleUnregisterRequest200Response) GetTaskID() string`

GetTaskID returns the TaskID field if non-nil, zero value otherwise.

### GetTaskIDOk

`func (o *OracleUnregisterRequest200Response) GetTaskIDOk() (*string, bool)`

GetTaskIDOk returns a tuple with the TaskID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskID

`func (o *OracleUnregisterRequest200Response) SetTaskID(v string)`

SetTaskID sets TaskID field to given value.

### HasTaskID

`func (o *OracleUnregisterRequest200Response) HasTaskID() bool`

HasTaskID returns a boolean if a field has been set.

### GetStatus

`func (o *OracleUnregisterRequest200Response) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleUnregisterRequest200Response) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleUnregisterRequest200Response) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *OracleUnregisterRequest200Response) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetSubstatus

`func (o *OracleUnregisterRequest200Response) GetSubstatus() string`

GetSubstatus returns the Substatus field if non-nil, zero value otherwise.

### GetSubstatusOk

`func (o *OracleUnregisterRequest200Response) GetSubstatusOk() (*string, bool)`

GetSubstatusOk returns a tuple with the Substatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSubstatus

`func (o *OracleUnregisterRequest200Response) SetSubstatus(v string)`

SetSubstatus sets Substatus field to given value.

### HasSubstatus

`func (o *OracleUnregisterRequest200Response) HasSubstatus() bool`

HasSubstatus returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


