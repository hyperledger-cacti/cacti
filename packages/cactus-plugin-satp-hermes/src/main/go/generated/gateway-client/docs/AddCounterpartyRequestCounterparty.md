# AddCounterpartyRequestCounterparty

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | The unique identifier for the gateway. | 
**PubKey** | **string** | The public key of the gateway. | 
**Name** | **string** | The name of the gateway. | 
**Version** | [**[]AddCounterpartyRequestCounterpartyVersionInner**](AddCounterpartyRequestCounterpartyVersionInner.md) | The draft versions supported by the gateway. | 
**ConnectedDLTs** | [**[]TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) | The list of connected DLT networks. | 
**ProofID** | **string** | The proof ID associated with the gateway. | 
**GatewayServerPort** | **int32** | The server port of the gateway. | 
**GatewayClientPort** | **int32** | The client port of the gateway. | 
**GatewayOapiPort** | Pointer to **int32** | The OpenAPI port of the gateway. | [optional] 
**GatewayUIPort** | Pointer to **int32** | The UI port of the gateway. | [optional] 
**Address** | **string** | A blockchain address. | 

## Methods

### NewAddCounterpartyRequestCounterparty

`func NewAddCounterpartyRequestCounterparty(id string, pubKey string, name string, version []AddCounterpartyRequestCounterpartyVersionInner, connectedDLTs []TransactRequestSourceAssetNetworkId, proofID string, gatewayServerPort int32, gatewayClientPort int32, address string, ) *AddCounterpartyRequestCounterparty`

NewAddCounterpartyRequestCounterparty instantiates a new AddCounterpartyRequestCounterparty object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddCounterpartyRequestCounterpartyWithDefaults

`func NewAddCounterpartyRequestCounterpartyWithDefaults() *AddCounterpartyRequestCounterparty`

NewAddCounterpartyRequestCounterpartyWithDefaults instantiates a new AddCounterpartyRequestCounterparty object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *AddCounterpartyRequestCounterparty) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *AddCounterpartyRequestCounterparty) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *AddCounterpartyRequestCounterparty) SetId(v string)`

SetId sets Id field to given value.


### GetPubKey

`func (o *AddCounterpartyRequestCounterparty) GetPubKey() string`

GetPubKey returns the PubKey field if non-nil, zero value otherwise.

### GetPubKeyOk

`func (o *AddCounterpartyRequestCounterparty) GetPubKeyOk() (*string, bool)`

GetPubKeyOk returns a tuple with the PubKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPubKey

`func (o *AddCounterpartyRequestCounterparty) SetPubKey(v string)`

SetPubKey sets PubKey field to given value.


### GetName

`func (o *AddCounterpartyRequestCounterparty) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *AddCounterpartyRequestCounterparty) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *AddCounterpartyRequestCounterparty) SetName(v string)`

SetName sets Name field to given value.


### GetVersion

`func (o *AddCounterpartyRequestCounterparty) GetVersion() []AddCounterpartyRequestCounterpartyVersionInner`

GetVersion returns the Version field if non-nil, zero value otherwise.

### GetVersionOk

`func (o *AddCounterpartyRequestCounterparty) GetVersionOk() (*[]AddCounterpartyRequestCounterpartyVersionInner, bool)`

GetVersionOk returns a tuple with the Version field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVersion

`func (o *AddCounterpartyRequestCounterparty) SetVersion(v []AddCounterpartyRequestCounterpartyVersionInner)`

SetVersion sets Version field to given value.


### GetConnectedDLTs

`func (o *AddCounterpartyRequestCounterparty) GetConnectedDLTs() []TransactRequestSourceAssetNetworkId`

GetConnectedDLTs returns the ConnectedDLTs field if non-nil, zero value otherwise.

### GetConnectedDLTsOk

`func (o *AddCounterpartyRequestCounterparty) GetConnectedDLTsOk() (*[]TransactRequestSourceAssetNetworkId, bool)`

GetConnectedDLTsOk returns a tuple with the ConnectedDLTs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnectedDLTs

`func (o *AddCounterpartyRequestCounterparty) SetConnectedDLTs(v []TransactRequestSourceAssetNetworkId)`

SetConnectedDLTs sets ConnectedDLTs field to given value.


### GetProofID

`func (o *AddCounterpartyRequestCounterparty) GetProofID() string`

GetProofID returns the ProofID field if non-nil, zero value otherwise.

### GetProofIDOk

`func (o *AddCounterpartyRequestCounterparty) GetProofIDOk() (*string, bool)`

GetProofIDOk returns a tuple with the ProofID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProofID

`func (o *AddCounterpartyRequestCounterparty) SetProofID(v string)`

SetProofID sets ProofID field to given value.


### GetGatewayServerPort

`func (o *AddCounterpartyRequestCounterparty) GetGatewayServerPort() int32`

GetGatewayServerPort returns the GatewayServerPort field if non-nil, zero value otherwise.

### GetGatewayServerPortOk

`func (o *AddCounterpartyRequestCounterparty) GetGatewayServerPortOk() (*int32, bool)`

GetGatewayServerPortOk returns a tuple with the GatewayServerPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayServerPort

`func (o *AddCounterpartyRequestCounterparty) SetGatewayServerPort(v int32)`

SetGatewayServerPort sets GatewayServerPort field to given value.


### GetGatewayClientPort

`func (o *AddCounterpartyRequestCounterparty) GetGatewayClientPort() int32`

GetGatewayClientPort returns the GatewayClientPort field if non-nil, zero value otherwise.

### GetGatewayClientPortOk

`func (o *AddCounterpartyRequestCounterparty) GetGatewayClientPortOk() (*int32, bool)`

GetGatewayClientPortOk returns a tuple with the GatewayClientPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayClientPort

`func (o *AddCounterpartyRequestCounterparty) SetGatewayClientPort(v int32)`

SetGatewayClientPort sets GatewayClientPort field to given value.


### GetGatewayOapiPort

`func (o *AddCounterpartyRequestCounterparty) GetGatewayOapiPort() int32`

GetGatewayOapiPort returns the GatewayOapiPort field if non-nil, zero value otherwise.

### GetGatewayOapiPortOk

`func (o *AddCounterpartyRequestCounterparty) GetGatewayOapiPortOk() (*int32, bool)`

GetGatewayOapiPortOk returns a tuple with the GatewayOapiPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayOapiPort

`func (o *AddCounterpartyRequestCounterparty) SetGatewayOapiPort(v int32)`

SetGatewayOapiPort sets GatewayOapiPort field to given value.

### HasGatewayOapiPort

`func (o *AddCounterpartyRequestCounterparty) HasGatewayOapiPort() bool`

HasGatewayOapiPort returns a boolean if a field has been set.

### GetGatewayUIPort

`func (o *AddCounterpartyRequestCounterparty) GetGatewayUIPort() int32`

GetGatewayUIPort returns the GatewayUIPort field if non-nil, zero value otherwise.

### GetGatewayUIPortOk

`func (o *AddCounterpartyRequestCounterparty) GetGatewayUIPortOk() (*int32, bool)`

GetGatewayUIPortOk returns a tuple with the GatewayUIPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayUIPort

`func (o *AddCounterpartyRequestCounterparty) SetGatewayUIPort(v int32)`

SetGatewayUIPort sets GatewayUIPort field to given value.

### HasGatewayUIPort

`func (o *AddCounterpartyRequestCounterparty) HasGatewayUIPort() bool`

HasGatewayUIPort returns a boolean if a field has been set.

### GetAddress

`func (o *AddCounterpartyRequestCounterparty) GetAddress() string`

GetAddress returns the Address field if non-nil, zero value otherwise.

### GetAddressOk

`func (o *AddCounterpartyRequestCounterparty) GetAddressOk() (*string, bool)`

GetAddressOk returns a tuple with the Address field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAddress

`func (o *AddCounterpartyRequestCounterparty) SetAddress(v string)`

SetAddress sets Address field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


