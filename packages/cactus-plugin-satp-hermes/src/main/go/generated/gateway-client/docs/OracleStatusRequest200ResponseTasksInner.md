# OracleStatusRequest200ResponseTasksInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the task. | 
**Timestamp** | **time.Time** | The timestamp when the task was created or last updated. | 
**Status** | **string** | The current status of the task. | 

## Methods

### NewOracleStatusRequest200ResponseTasksInner

`func NewOracleStatusRequest200ResponseTasksInner(id string, timestamp time.Time, status string, ) *OracleStatusRequest200ResponseTasksInner`

NewOracleStatusRequest200ResponseTasksInner instantiates a new OracleStatusRequest200ResponseTasksInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleStatusRequest200ResponseTasksInnerWithDefaults

`func NewOracleStatusRequest200ResponseTasksInnerWithDefaults() *OracleStatusRequest200ResponseTasksInner`

NewOracleStatusRequest200ResponseTasksInnerWithDefaults instantiates a new OracleStatusRequest200ResponseTasksInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleStatusRequest200ResponseTasksInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleStatusRequest200ResponseTasksInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleStatusRequest200ResponseTasksInner) SetId(v string)`

SetId sets Id field to given value.


### GetTimestamp

`func (o *OracleStatusRequest200ResponseTasksInner) GetTimestamp() time.Time`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleStatusRequest200ResponseTasksInner) GetTimestampOk() (*time.Time, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleStatusRequest200ResponseTasksInner) SetTimestamp(v time.Time)`

SetTimestamp sets Timestamp field to given value.


### GetStatus

`func (o *OracleStatusRequest200ResponseTasksInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleStatusRequest200ResponseTasksInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleStatusRequest200ResponseTasksInner) SetStatus(v string)`

SetStatus sets Status field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


