# TransactResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SessionID** | **string** | Unique identifier (UUID) for the session. | 
**StatusResponse** | [**Transact200ResponseStatusResponse**](Transact200ResponseStatusResponse.md) |  | 

## Methods

### NewTransactResponse

`func NewTransactResponse(sessionID string, statusResponse Transact200ResponseStatusResponse, ) *TransactResponse`

NewTransactResponse instantiates a new TransactResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransactResponseWithDefaults

`func NewTransactResponseWithDefaults() *TransactResponse`

NewTransactResponseWithDefaults instantiates a new TransactResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSessionID

`func (o *TransactResponse) GetSessionID() string`

GetSessionID returns the SessionID field if non-nil, zero value otherwise.

### GetSessionIDOk

`func (o *TransactResponse) GetSessionIDOk() (*string, bool)`

GetSessionIDOk returns a tuple with the SessionID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionID

`func (o *TransactResponse) SetSessionID(v string)`

SetSessionID sets SessionID field to given value.


### GetStatusResponse

`func (o *TransactResponse) GetStatusResponse() Transact200ResponseStatusResponse`

GetStatusResponse returns the StatusResponse field if non-nil, zero value otherwise.

### GetStatusResponseOk

`func (o *TransactResponse) GetStatusResponseOk() (*Transact200ResponseStatusResponse, bool)`

GetStatusResponseOk returns a tuple with the StatusResponse field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatusResponse

`func (o *TransactResponse) SetStatusResponse(v Transact200ResponseStatusResponse)`

SetStatusResponse sets StatusResponse field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


