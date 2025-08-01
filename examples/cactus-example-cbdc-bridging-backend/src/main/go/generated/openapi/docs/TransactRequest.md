# TransactRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Sender** | **string** |  | 
**Receiver** | **string** |  | 
**SourceChain** | [**AssetType**](AssetType.md) |  | 
**ReceiverChain** | [**AssetType**](AssetType.md) |  | 
**Amount** | **string** |  | 

## Methods

### NewTransactRequest

`func NewTransactRequest(sender string, receiver string, sourceChain AssetType, receiverChain AssetType, amount string, ) *TransactRequest`

NewTransactRequest instantiates a new TransactRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransactRequestWithDefaults

`func NewTransactRequestWithDefaults() *TransactRequest`

NewTransactRequestWithDefaults instantiates a new TransactRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSender

`func (o *TransactRequest) GetSender() string`

GetSender returns the Sender field if non-nil, zero value otherwise.

### GetSenderOk

`func (o *TransactRequest) GetSenderOk() (*string, bool)`

GetSenderOk returns a tuple with the Sender field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSender

`func (o *TransactRequest) SetSender(v string)`

SetSender sets Sender field to given value.


### GetReceiver

`func (o *TransactRequest) GetReceiver() string`

GetReceiver returns the Receiver field if non-nil, zero value otherwise.

### GetReceiverOk

`func (o *TransactRequest) GetReceiverOk() (*string, bool)`

GetReceiverOk returns a tuple with the Receiver field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReceiver

`func (o *TransactRequest) SetReceiver(v string)`

SetReceiver sets Receiver field to given value.


### GetSourceChain

`func (o *TransactRequest) GetSourceChain() AssetType`

GetSourceChain returns the SourceChain field if non-nil, zero value otherwise.

### GetSourceChainOk

`func (o *TransactRequest) GetSourceChainOk() (*AssetType, bool)`

GetSourceChainOk returns a tuple with the SourceChain field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceChain

`func (o *TransactRequest) SetSourceChain(v AssetType)`

SetSourceChain sets SourceChain field to given value.


### GetReceiverChain

`func (o *TransactRequest) GetReceiverChain() AssetType`

GetReceiverChain returns the ReceiverChain field if non-nil, zero value otherwise.

### GetReceiverChainOk

`func (o *TransactRequest) GetReceiverChainOk() (*AssetType, bool)`

GetReceiverChainOk returns a tuple with the ReceiverChain field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReceiverChain

`func (o *TransactRequest) SetReceiverChain(v AssetType)`

SetReceiverChain sets ReceiverChain field to given value.


### GetAmount

`func (o *TransactRequest) GetAmount() string`

GetAmount returns the Amount field if non-nil, zero value otherwise.

### GetAmountOk

`func (o *TransactRequest) GetAmountOk() (*string, bool)`

GetAmountOk returns a tuple with the Amount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmount

`func (o *TransactRequest) SetAmount(v string)`

SetAmount sets Amount field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


