# CancelRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SessionID** | **string** | Unique identifier (UUID) for the session. | 

## Methods

### NewCancelRequest

`func NewCancelRequest(sessionID string, ) *CancelRequest`

NewCancelRequest instantiates a new CancelRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCancelRequestWithDefaults

`func NewCancelRequestWithDefaults() *CancelRequest`

NewCancelRequestWithDefaults instantiates a new CancelRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSessionID

`func (o *CancelRequest) GetSessionID() string`

GetSessionID returns the SessionID field if non-nil, zero value otherwise.

### GetSessionIDOk

`func (o *CancelRequest) GetSessionIDOk() (*string, bool)`

GetSessionIDOk returns a tuple with the SessionID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionID

`func (o *CancelRequest) SetSessionID(v string)`

SetSessionID sets SessionID field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


