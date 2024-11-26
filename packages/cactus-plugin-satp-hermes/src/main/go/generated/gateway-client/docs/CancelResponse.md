# CancelResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**StatusResponse** | [**Transact200ResponseStatusResponse**](Transact200ResponseStatusResponse.md) |  | 
**CancelSuccessful** | **bool** | Indicates whether the cancel operation was successful. | 

## Methods

### NewCancelResponse

`func NewCancelResponse(statusResponse Transact200ResponseStatusResponse, cancelSuccessful bool, ) *CancelResponse`

NewCancelResponse instantiates a new CancelResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCancelResponseWithDefaults

`func NewCancelResponseWithDefaults() *CancelResponse`

NewCancelResponseWithDefaults instantiates a new CancelResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStatusResponse

`func (o *CancelResponse) GetStatusResponse() Transact200ResponseStatusResponse`

GetStatusResponse returns the StatusResponse field if non-nil, zero value otherwise.

### GetStatusResponseOk

`func (o *CancelResponse) GetStatusResponseOk() (*Transact200ResponseStatusResponse, bool)`

GetStatusResponseOk returns a tuple with the StatusResponse field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatusResponse

`func (o *CancelResponse) SetStatusResponse(v Transact200ResponseStatusResponse)`

SetStatusResponse sets StatusResponse field to given value.


### GetCancelSuccessful

`func (o *CancelResponse) GetCancelSuccessful() bool`

GetCancelSuccessful returns the CancelSuccessful field if non-nil, zero value otherwise.

### GetCancelSuccessfulOk

`func (o *CancelResponse) GetCancelSuccessfulOk() (*bool, bool)`

GetCancelSuccessfulOk returns a tuple with the CancelSuccessful field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCancelSuccessful

`func (o *CancelResponse) SetCancelSuccessful(v bool)`

SetCancelSuccessful sets CancelSuccessful field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


