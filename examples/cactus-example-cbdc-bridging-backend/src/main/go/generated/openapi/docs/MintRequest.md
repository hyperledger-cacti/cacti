# MintRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**User** | **string** |  | 
**Amount** | **string** |  | 
**Ledger** | [**AssetType**](AssetType.md) |  | 

## Methods

### NewMintRequest

`func NewMintRequest(user string, amount string, ledger AssetType, ) *MintRequest`

NewMintRequest instantiates a new MintRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMintRequestWithDefaults

`func NewMintRequestWithDefaults() *MintRequest`

NewMintRequestWithDefaults instantiates a new MintRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetUser

`func (o *MintRequest) GetUser() string`

GetUser returns the User field if non-nil, zero value otherwise.

### GetUserOk

`func (o *MintRequest) GetUserOk() (*string, bool)`

GetUserOk returns a tuple with the User field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUser

`func (o *MintRequest) SetUser(v string)`

SetUser sets User field to given value.


### GetAmount

`func (o *MintRequest) GetAmount() string`

GetAmount returns the Amount field if non-nil, zero value otherwise.

### GetAmountOk

`func (o *MintRequest) GetAmountOk() (*string, bool)`

GetAmountOk returns a tuple with the Amount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmount

`func (o *MintRequest) SetAmount(v string)`

SetAmount sets Amount field to given value.


### GetLedger

`func (o *MintRequest) GetLedger() AssetType`

GetLedger returns the Ledger field if non-nil, zero value otherwise.

### GetLedgerOk

`func (o *MintRequest) GetLedgerOk() (*AssetType, bool)`

GetLedgerOk returns a tuple with the Ledger field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLedger

`func (o *MintRequest) SetLedger(v AssetType)`

SetLedger sets Ledger field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


