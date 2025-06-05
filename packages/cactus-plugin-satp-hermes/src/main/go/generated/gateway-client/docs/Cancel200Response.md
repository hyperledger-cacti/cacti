# Cancel200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**StatusResponse** | [**Transact200ResponseStatusResponse**](Transact200ResponseStatusResponse.md) |  | 
**CancelSuccessful** | **bool** | Indicates whether the cancel operation was successful. | 

## Methods

### NewCancel200Response

`func NewCancel200Response(statusResponse Transact200ResponseStatusResponse, cancelSuccessful bool, ) *Cancel200Response`

NewCancel200Response instantiates a new Cancel200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCancel200ResponseWithDefaults

`func NewCancel200ResponseWithDefaults() *Cancel200Response`

NewCancel200ResponseWithDefaults instantiates a new Cancel200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStatusResponse

`func (o *Cancel200Response) GetStatusResponse() Transact200ResponseStatusResponse`

GetStatusResponse returns the StatusResponse field if non-nil, zero value otherwise.

### GetStatusResponseOk

`func (o *Cancel200Response) GetStatusResponseOk() (*Transact200ResponseStatusResponse, bool)`

GetStatusResponseOk returns a tuple with the StatusResponse field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatusResponse

`func (o *Cancel200Response) SetStatusResponse(v Transact200ResponseStatusResponse)`

SetStatusResponse sets StatusResponse field to given value.


### GetCancelSuccessful

`func (o *Cancel200Response) GetCancelSuccessful() bool`

GetCancelSuccessful returns the CancelSuccessful field if non-nil, zero value otherwise.

### GetCancelSuccessfulOk

`func (o *Cancel200Response) GetCancelSuccessfulOk() (*bool, bool)`

GetCancelSuccessfulOk returns a tuple with the CancelSuccessful field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCancelSuccessful

`func (o *Cancel200Response) SetCancelSuccessful(v bool)`

SetCancelSuccessful sets CancelSuccessful field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


