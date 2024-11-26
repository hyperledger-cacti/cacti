# PauseRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SessionId** | Pointer to **string** |  | [optional] 
**ContextId** | Pointer to **string** |  | [optional] 

## Methods

### NewPauseRequest

`func NewPauseRequest() *PauseRequest`

NewPauseRequest instantiates a new PauseRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPauseRequestWithDefaults

`func NewPauseRequestWithDefaults() *PauseRequest`

NewPauseRequestWithDefaults instantiates a new PauseRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSessionId

`func (o *PauseRequest) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *PauseRequest) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *PauseRequest) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.

### HasSessionId

`func (o *PauseRequest) HasSessionId() bool`

HasSessionId returns a boolean if a field has been set.

### GetContextId

`func (o *PauseRequest) GetContextId() string`

GetContextId returns the ContextId field if non-nil, zero value otherwise.

### GetContextIdOk

`func (o *PauseRequest) GetContextIdOk() (*string, bool)`

GetContextIdOk returns a tuple with the ContextId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContextId

`func (o *PauseRequest) SetContextId(v string)`

SetContextId sets ContextId field to given value.

### HasContextId

`func (o *PauseRequest) HasContextId() bool`

HasContextId returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


