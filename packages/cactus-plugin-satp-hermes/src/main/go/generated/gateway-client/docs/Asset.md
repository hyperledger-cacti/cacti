# Asset

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Owner** | **string** |  | 
**Ontology** | **string** |  | 
**ContractName** | **string** |  | 
**ContractAddress** | Pointer to **string** |  | [optional] 
**MspId** | Pointer to **string** |  | [optional] 
**ChannelName** | Pointer to **string** |  | [optional] 

## Methods

### NewAsset

`func NewAsset(owner string, ontology string, contractName string, ) *Asset`

NewAsset instantiates a new Asset object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAssetWithDefaults

`func NewAssetWithDefaults() *Asset`

NewAssetWithDefaults instantiates a new Asset object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetOwner

`func (o *Asset) GetOwner() string`

GetOwner returns the Owner field if non-nil, zero value otherwise.

### GetOwnerOk

`func (o *Asset) GetOwnerOk() (*string, bool)`

GetOwnerOk returns a tuple with the Owner field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOwner

`func (o *Asset) SetOwner(v string)`

SetOwner sets Owner field to given value.


### GetOntology

`func (o *Asset) GetOntology() string`

GetOntology returns the Ontology field if non-nil, zero value otherwise.

### GetOntologyOk

`func (o *Asset) GetOntologyOk() (*string, bool)`

GetOntologyOk returns a tuple with the Ontology field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOntology

`func (o *Asset) SetOntology(v string)`

SetOntology sets Ontology field to given value.


### GetContractName

`func (o *Asset) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *Asset) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *Asset) SetContractName(v string)`

SetContractName sets ContractName field to given value.


### GetContractAddress

`func (o *Asset) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *Asset) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *Asset) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *Asset) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### GetMspId

`func (o *Asset) GetMspId() string`

GetMspId returns the MspId field if non-nil, zero value otherwise.

### GetMspIdOk

`func (o *Asset) GetMspIdOk() (*string, bool)`

GetMspIdOk returns a tuple with the MspId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMspId

`func (o *Asset) SetMspId(v string)`

SetMspId sets MspId field to given value.

### HasMspId

`func (o *Asset) HasMspId() bool`

HasMspId returns a boolean if a field has been set.

### GetChannelName

`func (o *Asset) GetChannelName() string`

GetChannelName returns the ChannelName field if non-nil, zero value otherwise.

### GetChannelNameOk

`func (o *Asset) GetChannelNameOk() (*string, bool)`

GetChannelNameOk returns a tuple with the ChannelName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelName

`func (o *Asset) SetChannelName(v string)`

SetChannelName sets ChannelName field to given value.

### HasChannelName

`func (o *Asset) HasChannelName() bool`

HasChannelName returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


