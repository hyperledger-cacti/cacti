# NetworkID

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** | The network of the DLT being interacted with. | [optional] 
**Type** | Pointer to **string** | Enumerates the different ledger vendors and their major versions encoded within the name of the LedgerType. For example \&quot;BESU_1X\&quot; involves all of the [1.0.0;2.0.0) where 1.0.0 is included and anything up until, but not 2.0.0. See: https://stackoverflow.com/a/4396303/698470 for further explanation. | [optional] 

## Methods

### NewNetworkID

`func NewNetworkID() *NetworkID`

NewNetworkID instantiates a new NetworkID object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNetworkIDWithDefaults

`func NewNetworkIDWithDefaults() *NetworkID`

NewNetworkIDWithDefaults instantiates a new NetworkID object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *NetworkID) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *NetworkID) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *NetworkID) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *NetworkID) HasId() bool`

HasId returns a boolean if a field has been set.

### GetType

`func (o *NetworkID) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *NetworkID) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *NetworkID) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *NetworkID) HasType() bool`

HasType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


