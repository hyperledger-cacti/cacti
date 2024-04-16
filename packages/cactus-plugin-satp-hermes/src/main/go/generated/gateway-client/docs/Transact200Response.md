# Transact200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SessionID** | **string** | Unique identifier (UUID) for the session. | 
**StatusResponse** | [**Transact200ResponseStatusResponse**](Transact200ResponseStatusResponse.md) |  | 

## Methods

### NewTransact200Response

`func NewTransact200Response(sessionID string, statusResponse Transact200ResponseStatusResponse, ) *Transact200Response`

NewTransact200Response instantiates a new Transact200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransact200ResponseWithDefaults

`func NewTransact200ResponseWithDefaults() *Transact200Response`

NewTransact200ResponseWithDefaults instantiates a new Transact200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSessionID

`func (o *Transact200Response) GetSessionID() string`

GetSessionID returns the SessionID field if non-nil, zero value otherwise.

### GetSessionIDOk

`func (o *Transact200Response) GetSessionIDOk() (*string, bool)`

GetSessionIDOk returns a tuple with the SessionID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionID

`func (o *Transact200Response) SetSessionID(v string)`

SetSessionID sets SessionID field to given value.


### GetStatusResponse

`func (o *Transact200Response) GetStatusResponse() Transact200ResponseStatusResponse`

GetStatusResponse returns the StatusResponse field if non-nil, zero value otherwise.

### GetStatusResponseOk

`func (o *Transact200Response) GetStatusResponseOk() (*Transact200ResponseStatusResponse, bool)`

GetStatusResponseOk returns a tuple with the StatusResponse field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatusResponse

`func (o *Transact200Response) SetStatusResponse(v Transact200ResponseStatusResponse)`

SetStatusResponse sets StatusResponse field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


