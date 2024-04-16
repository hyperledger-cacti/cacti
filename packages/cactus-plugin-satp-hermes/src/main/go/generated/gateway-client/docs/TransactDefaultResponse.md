# TransactDefaultResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Type** | **string** | HTTP error type | 
**Code** | **int32** | Numeric error code | 
**Status** | **int32** | HTTP status of the error | 
**Message** | **string** | Long error description | 
**Timestamp** | **string** | Timestamp of the error | 

## Methods

### NewTransactDefaultResponse

`func NewTransactDefaultResponse(type_ string, code int32, status int32, message string, timestamp string, ) *TransactDefaultResponse`

NewTransactDefaultResponse instantiates a new TransactDefaultResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransactDefaultResponseWithDefaults

`func NewTransactDefaultResponseWithDefaults() *TransactDefaultResponse`

NewTransactDefaultResponseWithDefaults instantiates a new TransactDefaultResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetType

`func (o *TransactDefaultResponse) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *TransactDefaultResponse) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *TransactDefaultResponse) SetType(v string)`

SetType sets Type field to given value.


### GetCode

`func (o *TransactDefaultResponse) GetCode() int32`

GetCode returns the Code field if non-nil, zero value otherwise.

### GetCodeOk

`func (o *TransactDefaultResponse) GetCodeOk() (*int32, bool)`

GetCodeOk returns a tuple with the Code field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCode

`func (o *TransactDefaultResponse) SetCode(v int32)`

SetCode sets Code field to given value.


### GetStatus

`func (o *TransactDefaultResponse) GetStatus() int32`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *TransactDefaultResponse) GetStatusOk() (*int32, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *TransactDefaultResponse) SetStatus(v int32)`

SetStatus sets Status field to given value.


### GetMessage

`func (o *TransactDefaultResponse) GetMessage() string`

GetMessage returns the Message field if non-nil, zero value otherwise.

### GetMessageOk

`func (o *TransactDefaultResponse) GetMessageOk() (*string, bool)`

GetMessageOk returns a tuple with the Message field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMessage

`func (o *TransactDefaultResponse) SetMessage(v string)`

SetMessage sets Message field to given value.


### GetTimestamp

`func (o *TransactDefaultResponse) GetTimestamp() string`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *TransactDefaultResponse) GetTimestampOk() (*string, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *TransactDefaultResponse) SetTimestamp(v string)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


