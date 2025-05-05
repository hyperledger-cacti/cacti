# NetworkId

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | The network of the DLT being interacted with. | 
**LedgerType** | **string** | Enumerates the different ledger vendors and their major versions encoded within the name of the LedgerType. For example \&quot;BESU_1X\&quot; involves all of the [1.0.0;2.0.0) where 1.0.0 is included and anything up until, but not 2.0.0. See: https://stackoverflow.com/a/4396303/698470 for further explanation. | 

## Methods

### NewNetworkId

`func NewNetworkId(id string, ledgerType string, ) *NetworkId`

NewNetworkId instantiates a new NetworkId object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNetworkIdWithDefaults

`func NewNetworkIdWithDefaults() *NetworkId`

NewNetworkIdWithDefaults instantiates a new NetworkId object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *NetworkId) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *NetworkId) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *NetworkId) SetId(v string)`

SetId sets Id field to given value.


### GetLedgerType

`func (o *NetworkId) GetLedgerType() string`

GetLedgerType returns the LedgerType field if non-nil, zero value otherwise.

### GetLedgerTypeOk

`func (o *NetworkId) GetLedgerTypeOk() (*string, bool)`

GetLedgerTypeOk returns a tuple with the LedgerType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLedgerType

`func (o *NetworkId) SetLedgerType(v string)`

SetLedgerType sets LedgerType field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


