# ContinueRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SessionId** | **string** | A unique identifier for the transaction session to be continued. | 
**ContextId** | **string** | A unique identifier for the transaction context. | 

## Methods

### NewContinueRequest

`func NewContinueRequest(sessionId string, contextId string, ) *ContinueRequest`

NewContinueRequest instantiates a new ContinueRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewContinueRequestWithDefaults

`func NewContinueRequestWithDefaults() *ContinueRequest`

NewContinueRequestWithDefaults instantiates a new ContinueRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSessionId

`func (o *ContinueRequest) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *ContinueRequest) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *ContinueRequest) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.


### GetContextId

`func (o *ContinueRequest) GetContextId() string`

GetContextId returns the ContextId field if non-nil, zero value otherwise.

### GetContextIdOk

`func (o *ContinueRequest) GetContextIdOk() (*string, bool)`

GetContextIdOk returns a tuple with the ContextId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContextId

`func (o *ContinueRequest) SetContextId(v string)`

SetContextId sets ContextId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


