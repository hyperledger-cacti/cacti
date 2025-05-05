# GetApproveAddressApproveAddressRequestParameterNetworkID

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** | The network of the DLT being interacted with. | [optional] 
**Type** | Pointer to **string** | Enumerates the different ledger vendors and their major versions encoded within the name of the LedgerType. For example \&quot;BESU_1X\&quot; involves all of the [1.0.0;2.0.0) where 1.0.0 is included and anything up until, but not 2.0.0. See: https://stackoverflow.com/a/4396303/698470 for further explanation. | [optional] 

## Methods

### NewGetApproveAddressApproveAddressRequestParameterNetworkID

`func NewGetApproveAddressApproveAddressRequestParameterNetworkID() *GetApproveAddressApproveAddressRequestParameterNetworkID`

NewGetApproveAddressApproveAddressRequestParameterNetworkID instantiates a new GetApproveAddressApproveAddressRequestParameterNetworkID object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetApproveAddressApproveAddressRequestParameterNetworkIDWithDefaults

`func NewGetApproveAddressApproveAddressRequestParameterNetworkIDWithDefaults() *GetApproveAddressApproveAddressRequestParameterNetworkID`

NewGetApproveAddressApproveAddressRequestParameterNetworkIDWithDefaults instantiates a new GetApproveAddressApproveAddressRequestParameterNetworkID object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) HasId() bool`

HasId returns a boolean if a field has been set.

### GetType

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *GetApproveAddressApproveAddressRequestParameterNetworkID) HasType() bool`

HasType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


