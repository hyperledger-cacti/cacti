# TransactRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContextID** | **string** | The unique identifier of the task. | 
**Payload** | Pointer to **string** |  | [optional] 
**BeneficiaryPubkey** | **string** |  | 
**OriginatorPubkey** | **string** |  | 
**SourceAsset** | [**TransactRequestSourceAsset**](TransactRequestSourceAsset.md) |  | 
**ReceiverAsset** | [**TransactRequestSourceAsset**](TransactRequestSourceAsset.md) |  | 

## Methods

### NewTransactRequest

`func NewTransactRequest(contextID string, beneficiaryPubkey string, originatorPubkey string, sourceAsset TransactRequestSourceAsset, receiverAsset TransactRequestSourceAsset, ) *TransactRequest`

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


### GetPayload

`func (o *TransactRequest) GetPayload() string`

GetPayload returns the Payload field if non-nil, zero value otherwise.

### GetPayloadOk

`func (o *TransactRequest) GetPayloadOk() (*string, bool)`

GetPayloadOk returns a tuple with the Payload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayload

`func (o *TransactRequest) SetPayload(v string)`

SetPayload sets Payload field to given value.

### HasPayload

`func (o *TransactRequest) HasPayload() bool`

HasPayload returns a boolean if a field has been set.

### GetBeneficiaryPubkey

`func (o *TransactRequest) GetBeneficiaryPubkey() string`

GetBeneficiaryPubkey returns the BeneficiaryPubkey field if non-nil, zero value otherwise.

### GetBeneficiaryPubkeyOk

`func (o *TransactRequest) GetBeneficiaryPubkeyOk() (*string, bool)`

GetBeneficiaryPubkeyOk returns a tuple with the BeneficiaryPubkey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBeneficiaryPubkey

`func (o *TransactRequest) SetBeneficiaryPubkey(v string)`

SetBeneficiaryPubkey sets BeneficiaryPubkey field to given value.


### GetOriginatorPubkey

`func (o *TransactRequest) GetOriginatorPubkey() string`

GetOriginatorPubkey returns the OriginatorPubkey field if non-nil, zero value otherwise.

### GetOriginatorPubkeyOk

`func (o *TransactRequest) GetOriginatorPubkeyOk() (*string, bool)`

GetOriginatorPubkeyOk returns a tuple with the OriginatorPubkey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginatorPubkey

`func (o *TransactRequest) SetOriginatorPubkey(v string)`

SetOriginatorPubkey sets OriginatorPubkey field to given value.


### GetSourceAsset

`func (o *TransactRequest) GetSourceAsset() TransactRequestSourceAsset`

GetSourceAsset returns the SourceAsset field if non-nil, zero value otherwise.

### GetSourceAssetOk

`func (o *TransactRequest) GetSourceAssetOk() (*TransactRequestSourceAsset, bool)`

GetSourceAssetOk returns a tuple with the SourceAsset field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceAsset

`func (o *TransactRequest) SetSourceAsset(v TransactRequestSourceAsset)`

SetSourceAsset sets SourceAsset field to given value.


### GetReceiverAsset

`func (o *TransactRequest) GetReceiverAsset() TransactRequestSourceAsset`

GetReceiverAsset returns the ReceiverAsset field if non-nil, zero value otherwise.

### GetReceiverAssetOk

`func (o *TransactRequest) GetReceiverAssetOk() (*TransactRequestSourceAsset, bool)`

GetReceiverAssetOk returns a tuple with the ReceiverAsset field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReceiverAsset

`func (o *TransactRequest) SetReceiverAsset(v TransactRequestSourceAsset)`

SetReceiverAsset sets ReceiverAsset field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


