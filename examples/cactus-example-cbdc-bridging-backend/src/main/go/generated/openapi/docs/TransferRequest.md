# TransferRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**From** | **string** |  | 
**To** | **string** |  | 
**SourceChain** | [**AssetType**](AssetType.md) |  | 
**ReceiverChain** | [**AssetType**](AssetType.md) |  | 
**Amount** | **string** |  | 

## Methods

### NewTransferRequest

`func NewTransferRequest(from string, to string, sourceChain AssetType, receiverChain AssetType, amount string, ) *TransferRequest`

NewTransferRequest instantiates a new TransferRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransferRequestWithDefaults

`func NewTransferRequestWithDefaults() *TransferRequest`

NewTransferRequestWithDefaults instantiates a new TransferRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFrom

`func (o *TransferRequest) GetFrom() string`

GetFrom returns the From field if non-nil, zero value otherwise.

### GetFromOk

`func (o *TransferRequest) GetFromOk() (*string, bool)`

GetFromOk returns a tuple with the From field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFrom

`func (o *TransferRequest) SetFrom(v string)`

SetFrom sets From field to given value.


### GetTo

`func (o *TransferRequest) GetTo() string`

GetTo returns the To field if non-nil, zero value otherwise.

### GetToOk

`func (o *TransferRequest) GetToOk() (*string, bool)`

GetToOk returns a tuple with the To field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTo

`func (o *TransferRequest) SetTo(v string)`

SetTo sets To field to given value.


### GetSourceChain

`func (o *TransferRequest) GetSourceChain() AssetType`

GetSourceChain returns the SourceChain field if non-nil, zero value otherwise.

### GetSourceChainOk

`func (o *TransferRequest) GetSourceChainOk() (*AssetType, bool)`

GetSourceChainOk returns a tuple with the SourceChain field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceChain

`func (o *TransferRequest) SetSourceChain(v AssetType)`

SetSourceChain sets SourceChain field to given value.


### GetReceiverChain

`func (o *TransferRequest) GetReceiverChain() AssetType`

GetReceiverChain returns the ReceiverChain field if non-nil, zero value otherwise.

### GetReceiverChainOk

`func (o *TransferRequest) GetReceiverChainOk() (*AssetType, bool)`

GetReceiverChainOk returns a tuple with the ReceiverChain field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReceiverChain

`func (o *TransferRequest) SetReceiverChain(v AssetType)`

SetReceiverChain sets ReceiverChain field to given value.


### GetAmount

`func (o *TransferRequest) GetAmount() string`

GetAmount returns the Amount field if non-nil, zero value otherwise.

### GetAmountOk

`func (o *TransferRequest) GetAmountOk() (*string, bool)`

GetAmountOk returns a tuple with the Amount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmount

`func (o *TransferRequest) SetAmount(v string)`

SetAmount sets Amount field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


