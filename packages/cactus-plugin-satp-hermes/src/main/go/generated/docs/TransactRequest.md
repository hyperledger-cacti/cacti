# TransactRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContextID** | **string** | A unique identifier for the transaction context. | 
**FromDLTNetworkID** | **string** | The network of the DLT being interacted with. TODO: implement network identification draft | 
**FromAmount** | **string** | The amount in string format including all decimals. | 
**FromToken** | [**TransactRequestFromToken**](TransactRequestFromToken.md) |  | 
**ToDLTNetworkID** | **string** | The network of the DLT being interacted with. TODO: implement network identification draft | 
**ToAmount** | **string** | The amount in string format including all decimals. | 
**ToToken** | [**TransactRequestFromToken**](TransactRequestFromToken.md) |  | 

## Methods

### NewTransactRequest

`func NewTransactRequest(contextID string, fromDLTNetworkID string, fromAmount string, fromToken TransactRequestFromToken, toDLTNetworkID string, toAmount string, toToken TransactRequestFromToken, ) *TransactRequest`

NewTransactRequest instantiates a new TransactRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransactRequestWithDefaults

`func NewTransactRequestWithDefaults() *TransactRequest`

NewTransactRequestWithDefaults instantiates a new TransactRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContextID

`func (o *TransactRequest) GetContextID() string`

GetContextID returns the ContextID field if non-nil, zero value otherwise.

### GetContextIDOk

`func (o *TransactRequest) GetContextIDOk() (*string, bool)`

GetContextIDOk returns a tuple with the ContextID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContextID

`func (o *TransactRequest) SetContextID(v string)`

SetContextID sets ContextID field to given value.


### GetFromDLTNetworkID

`func (o *TransactRequest) GetFromDLTNetworkID() string`

GetFromDLTNetworkID returns the FromDLTNetworkID field if non-nil, zero value otherwise.

### GetFromDLTNetworkIDOk

`func (o *TransactRequest) GetFromDLTNetworkIDOk() (*string, bool)`

GetFromDLTNetworkIDOk returns a tuple with the FromDLTNetworkID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromDLTNetworkID

`func (o *TransactRequest) SetFromDLTNetworkID(v string)`

SetFromDLTNetworkID sets FromDLTNetworkID field to given value.


### GetFromAmount

`func (o *TransactRequest) GetFromAmount() string`

GetFromAmount returns the FromAmount field if non-nil, zero value otherwise.

### GetFromAmountOk

`func (o *TransactRequest) GetFromAmountOk() (*string, bool)`

GetFromAmountOk returns a tuple with the FromAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmount

`func (o *TransactRequest) SetFromAmount(v string)`

SetFromAmount sets FromAmount field to given value.


### GetFromToken

`func (o *TransactRequest) GetFromToken() TransactRequestFromToken`

GetFromToken returns the FromToken field if non-nil, zero value otherwise.

### GetFromTokenOk

`func (o *TransactRequest) GetFromTokenOk() (*TransactRequestFromToken, bool)`

GetFromTokenOk returns a tuple with the FromToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromToken

`func (o *TransactRequest) SetFromToken(v TransactRequestFromToken)`

SetFromToken sets FromToken field to given value.


### GetToDLTNetworkID

`func (o *TransactRequest) GetToDLTNetworkID() string`

GetToDLTNetworkID returns the ToDLTNetworkID field if non-nil, zero value otherwise.

### GetToDLTNetworkIDOk

`func (o *TransactRequest) GetToDLTNetworkIDOk() (*string, bool)`

GetToDLTNetworkIDOk returns a tuple with the ToDLTNetworkID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToDLTNetworkID

`func (o *TransactRequest) SetToDLTNetworkID(v string)`

SetToDLTNetworkID sets ToDLTNetworkID field to given value.


### GetToAmount

`func (o *TransactRequest) GetToAmount() string`

GetToAmount returns the ToAmount field if non-nil, zero value otherwise.

### GetToAmountOk

`func (o *TransactRequest) GetToAmountOk() (*string, bool)`

GetToAmountOk returns a tuple with the ToAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmount

`func (o *TransactRequest) SetToAmount(v string)`

SetToAmount sets ToAmount field to given value.


### GetToToken

`func (o *TransactRequest) GetToToken() TransactRequestFromToken`

GetToToken returns the ToToken field if non-nil, zero value otherwise.

### GetToTokenOk

`func (o *TransactRequest) GetToTokenOk() (*TransactRequestFromToken, bool)`

GetToTokenOk returns a tuple with the ToToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToToken

`func (o *TransactRequest) SetToToken(v TransactRequestFromToken)`

SetToToken sets ToToken field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


