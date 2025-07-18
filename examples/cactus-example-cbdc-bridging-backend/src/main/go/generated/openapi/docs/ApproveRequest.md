# ApproveRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**User** | **string** |  | 
**Amount** | **string** |  | 
**Ledger** | [**AssetType**](AssetType.md) |  | 

## Methods

### NewApproveRequest

`func NewApproveRequest(user string, amount string, ledger AssetType, ) *ApproveRequest`

NewApproveRequest instantiates a new ApproveRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApproveRequestWithDefaults

`func NewApproveRequestWithDefaults() *ApproveRequest`

NewApproveRequestWithDefaults instantiates a new ApproveRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetUser

`func (o *ApproveRequest) GetUser() string`

GetUser returns the User field if non-nil, zero value otherwise.

### GetUserOk

`func (o *ApproveRequest) GetUserOk() (*string, bool)`

GetUserOk returns a tuple with the User field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUser

`func (o *ApproveRequest) SetUser(v string)`

SetUser sets User field to given value.


### GetAmount

`func (o *ApproveRequest) GetAmount() string`

GetAmount returns the Amount field if non-nil, zero value otherwise.

### GetAmountOk

`func (o *ApproveRequest) GetAmountOk() (*string, bool)`

GetAmountOk returns a tuple with the Amount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmount

`func (o *ApproveRequest) SetAmount(v string)`

SetAmount sets Amount field to given value.


### GetLedger

`func (o *ApproveRequest) GetLedger() AssetType`

GetLedger returns the Ledger field if non-nil, zero value otherwise.

### GetLedgerOk

`func (o *ApproveRequest) GetLedgerOk() (*AssetType, bool)`

GetLedgerOk returns a tuple with the Ledger field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLedger

`func (o *ApproveRequest) SetLedger(v AssetType)`

SetLedger sets Ledger field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


