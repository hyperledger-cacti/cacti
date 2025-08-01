# AddCounterpartyGatewayRequestCounterparty

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | The unique identifier for the gateway. | 
**PubKey** | **string** | The public key of the gateway. | 
**Name** | **string** | The name of the gateway. | 
**Version** | [**[]GatewayIdentityVersionInner**](GatewayIdentityVersionInner.md) | The draft versions supported by the gateway. | 
**ConnectedDLTs** | [**[]TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) | The list of connected DLT networks. | 
**ProofID** | **string** | The proof ID associated with the gateway. | 
**GatewayServerPort** | **int32** | The server port of the gateway. | 
**GatewayClientPort** | **int32** | The client port of the gateway. | 
**GatewayOapiPort** | Pointer to **int32** | The OpenAPI port of the gateway. | [optional] 
**GatewayUIPort** | Pointer to **int32** | The UI port of the gateway. | [optional] 
**Address** | **string** | A blockchain address. | 

## Methods

### NewAddCounterpartyGatewayRequestCounterparty

`func NewAddCounterpartyGatewayRequestCounterparty(id string, pubKey string, name string, version []GatewayIdentityVersionInner, connectedDLTs []TransactRequestSourceAssetNetworkId, proofID string, gatewayServerPort int32, gatewayClientPort int32, address string, ) *AddCounterpartyGatewayRequestCounterparty`

NewAddCounterpartyGatewayRequestCounterparty instantiates a new AddCounterpartyGatewayRequestCounterparty object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddCounterpartyGatewayRequestCounterpartyWithDefaults

`func NewAddCounterpartyGatewayRequestCounterpartyWithDefaults() *AddCounterpartyGatewayRequestCounterparty`

NewAddCounterpartyGatewayRequestCounterpartyWithDefaults instantiates a new AddCounterpartyGatewayRequestCounterparty object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *AddCounterpartyGatewayRequestCounterparty) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *AddCounterpartyGatewayRequestCounterparty) SetId(v string)`

SetId sets Id field to given value.


### GetPubKey

`func (o *AddCounterpartyGatewayRequestCounterparty) GetPubKey() string`

GetPubKey returns the PubKey field if non-nil, zero value otherwise.

### GetPubKeyOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetPubKeyOk() (*string, bool)`

GetPubKeyOk returns a tuple with the PubKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPubKey

`func (o *AddCounterpartyGatewayRequestCounterparty) SetPubKey(v string)`

SetPubKey sets PubKey field to given value.


### GetName

`func (o *AddCounterpartyGatewayRequestCounterparty) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *AddCounterpartyGatewayRequestCounterparty) SetName(v string)`

SetName sets Name field to given value.


### GetVersion

`func (o *AddCounterpartyGatewayRequestCounterparty) GetVersion() []GatewayIdentityVersionInner`

GetVersion returns the Version field if non-nil, zero value otherwise.

### GetVersionOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetVersionOk() (*[]GatewayIdentityVersionInner, bool)`

GetVersionOk returns a tuple with the Version field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVersion

`func (o *AddCounterpartyGatewayRequestCounterparty) SetVersion(v []GatewayIdentityVersionInner)`

SetVersion sets Version field to given value.


### GetConnectedDLTs

`func (o *AddCounterpartyGatewayRequestCounterparty) GetConnectedDLTs() []TransactRequestSourceAssetNetworkId`

GetConnectedDLTs returns the ConnectedDLTs field if non-nil, zero value otherwise.

### GetConnectedDLTsOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetConnectedDLTsOk() (*[]TransactRequestSourceAssetNetworkId, bool)`

GetConnectedDLTsOk returns a tuple with the ConnectedDLTs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnectedDLTs

`func (o *AddCounterpartyGatewayRequestCounterparty) SetConnectedDLTs(v []TransactRequestSourceAssetNetworkId)`

SetConnectedDLTs sets ConnectedDLTs field to given value.


### GetProofID

`func (o *AddCounterpartyGatewayRequestCounterparty) GetProofID() string`

GetProofID returns the ProofID field if non-nil, zero value otherwise.

### GetProofIDOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetProofIDOk() (*string, bool)`

GetProofIDOk returns a tuple with the ProofID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProofID

`func (o *AddCounterpartyGatewayRequestCounterparty) SetProofID(v string)`

SetProofID sets ProofID field to given value.


### GetGatewayServerPort

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayServerPort() int32`

GetGatewayServerPort returns the GatewayServerPort field if non-nil, zero value otherwise.

### GetGatewayServerPortOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayServerPortOk() (*int32, bool)`

GetGatewayServerPortOk returns a tuple with the GatewayServerPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayServerPort

`func (o *AddCounterpartyGatewayRequestCounterparty) SetGatewayServerPort(v int32)`

SetGatewayServerPort sets GatewayServerPort field to given value.


### GetGatewayClientPort

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayClientPort() int32`

GetGatewayClientPort returns the GatewayClientPort field if non-nil, zero value otherwise.

### GetGatewayClientPortOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayClientPortOk() (*int32, bool)`

GetGatewayClientPortOk returns a tuple with the GatewayClientPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayClientPort

`func (o *AddCounterpartyGatewayRequestCounterparty) SetGatewayClientPort(v int32)`

SetGatewayClientPort sets GatewayClientPort field to given value.


### GetGatewayOapiPort

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayOapiPort() int32`

GetGatewayOapiPort returns the GatewayOapiPort field if non-nil, zero value otherwise.

### GetGatewayOapiPortOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayOapiPortOk() (*int32, bool)`

GetGatewayOapiPortOk returns a tuple with the GatewayOapiPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayOapiPort

`func (o *AddCounterpartyGatewayRequestCounterparty) SetGatewayOapiPort(v int32)`

SetGatewayOapiPort sets GatewayOapiPort field to given value.

### HasGatewayOapiPort

`func (o *AddCounterpartyGatewayRequestCounterparty) HasGatewayOapiPort() bool`

HasGatewayOapiPort returns a boolean if a field has been set.

### GetGatewayUIPort

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayUIPort() int32`

GetGatewayUIPort returns the GatewayUIPort field if non-nil, zero value otherwise.

### GetGatewayUIPortOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetGatewayUIPortOk() (*int32, bool)`

GetGatewayUIPortOk returns a tuple with the GatewayUIPort field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayUIPort

`func (o *AddCounterpartyGatewayRequestCounterparty) SetGatewayUIPort(v int32)`

SetGatewayUIPort sets GatewayUIPort field to given value.

### HasGatewayUIPort

`func (o *AddCounterpartyGatewayRequestCounterparty) HasGatewayUIPort() bool`

HasGatewayUIPort returns a boolean if a field has been set.

### GetAddress

`func (o *AddCounterpartyGatewayRequestCounterparty) GetAddress() string`

GetAddress returns the Address field if non-nil, zero value otherwise.

### GetAddressOk

`func (o *AddCounterpartyGatewayRequestCounterparty) GetAddressOk() (*string, bool)`

GetAddressOk returns a tuple with the Address field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAddress

`func (o *AddCounterpartyGatewayRequestCounterparty) SetAddress(v string)`

SetAddress sets Address field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


