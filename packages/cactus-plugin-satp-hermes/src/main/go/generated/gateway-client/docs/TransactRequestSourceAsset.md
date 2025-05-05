# TransactRequestSourceAsset

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Owner** | **string** |  | 
**ContractName** | **string** |  | 
**ContractAddress** | Pointer to **string** |  | [optional] 
**MspId** | Pointer to **string** |  | [optional] 
**ChannelName** | Pointer to **string** |  | [optional] 
**Amount** | Pointer to **string** |  | [optional] 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**TokenType** | **string** | The type of token. | 
**ReferenceId** | **string** |  | 

## Methods

### NewTransactRequestSourceAsset

`func NewTransactRequestSourceAsset(id string, owner string, contractName string, networkId TransactRequestSourceAssetNetworkId, tokenType string, referenceId string, ) *TransactRequestSourceAsset`

NewTransactRequestSourceAsset instantiates a new TransactRequestSourceAsset object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransactRequestSourceAssetWithDefaults

`func NewTransactRequestSourceAssetWithDefaults() *TransactRequestSourceAsset`

NewTransactRequestSourceAssetWithDefaults instantiates a new TransactRequestSourceAsset object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *TransactRequestSourceAsset) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *TransactRequestSourceAsset) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *TransactRequestSourceAsset) SetId(v string)`

SetId sets Id field to given value.


### GetOwner

`func (o *TransactRequestSourceAsset) GetOwner() string`

GetOwner returns the Owner field if non-nil, zero value otherwise.

### GetOwnerOk

`func (o *TransactRequestSourceAsset) GetOwnerOk() (*string, bool)`

GetOwnerOk returns a tuple with the Owner field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOwner

`func (o *TransactRequestSourceAsset) SetOwner(v string)`

SetOwner sets Owner field to given value.


### GetContractName

`func (o *TransactRequestSourceAsset) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *TransactRequestSourceAsset) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *TransactRequestSourceAsset) SetContractName(v string)`

SetContractName sets ContractName field to given value.


### GetContractAddress

`func (o *TransactRequestSourceAsset) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *TransactRequestSourceAsset) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *TransactRequestSourceAsset) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *TransactRequestSourceAsset) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### GetMspId

`func (o *TransactRequestSourceAsset) GetMspId() string`

GetMspId returns the MspId field if non-nil, zero value otherwise.

### GetMspIdOk

`func (o *TransactRequestSourceAsset) GetMspIdOk() (*string, bool)`

GetMspIdOk returns a tuple with the MspId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMspId

`func (o *TransactRequestSourceAsset) SetMspId(v string)`

SetMspId sets MspId field to given value.

### HasMspId

`func (o *TransactRequestSourceAsset) HasMspId() bool`

HasMspId returns a boolean if a field has been set.

### GetChannelName

`func (o *TransactRequestSourceAsset) GetChannelName() string`

GetChannelName returns the ChannelName field if non-nil, zero value otherwise.

### GetChannelNameOk

`func (o *TransactRequestSourceAsset) GetChannelNameOk() (*string, bool)`

GetChannelNameOk returns a tuple with the ChannelName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelName

`func (o *TransactRequestSourceAsset) SetChannelName(v string)`

SetChannelName sets ChannelName field to given value.

### HasChannelName

`func (o *TransactRequestSourceAsset) HasChannelName() bool`

HasChannelName returns a boolean if a field has been set.

### GetAmount

`func (o *TransactRequestSourceAsset) GetAmount() string`

GetAmount returns the Amount field if non-nil, zero value otherwise.

### GetAmountOk

`func (o *TransactRequestSourceAsset) GetAmountOk() (*string, bool)`

GetAmountOk returns a tuple with the Amount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmount

`func (o *TransactRequestSourceAsset) SetAmount(v string)`

SetAmount sets Amount field to given value.

### HasAmount

`func (o *TransactRequestSourceAsset) HasAmount() bool`

HasAmount returns a boolean if a field has been set.

### GetNetworkId

`func (o *TransactRequestSourceAsset) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *TransactRequestSourceAsset) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *TransactRequestSourceAsset) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetTokenType

`func (o *TransactRequestSourceAsset) GetTokenType() string`

GetTokenType returns the TokenType field if non-nil, zero value otherwise.

### GetTokenTypeOk

`func (o *TransactRequestSourceAsset) GetTokenTypeOk() (*string, bool)`

GetTokenTypeOk returns a tuple with the TokenType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenType

`func (o *TransactRequestSourceAsset) SetTokenType(v string)`

SetTokenType sets TokenType field to given value.


### GetReferenceId

`func (o *TransactRequestSourceAsset) GetReferenceId() string`

GetReferenceId returns the ReferenceId field if non-nil, zero value otherwise.

### GetReferenceIdOk

`func (o *TransactRequestSourceAsset) GetReferenceIdOk() (*string, bool)`

GetReferenceIdOk returns a tuple with the ReferenceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReferenceId

`func (o *TransactRequestSourceAsset) SetReferenceId(v string)`

SetReferenceId sets ReferenceId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


