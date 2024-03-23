# TransactRequestFromTokenExtensions

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**BridgeInfo** | Pointer to [**map[string]TransactRequestFromTokenExtensionsBridgeInfoValue**](TransactRequestFromTokenExtensionsBridgeInfoValue.md) |  | [optional] 
**Verified** | Pointer to **bool** | Indicates whether the token is verified. | [optional] 

## Methods

### NewTransactRequestFromTokenExtensions

`func NewTransactRequestFromTokenExtensions() *TransactRequestFromTokenExtensions`

NewTransactRequestFromTokenExtensions instantiates a new TransactRequestFromTokenExtensions object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTransactRequestFromTokenExtensionsWithDefaults

`func NewTransactRequestFromTokenExtensionsWithDefaults() *TransactRequestFromTokenExtensions`

NewTransactRequestFromTokenExtensionsWithDefaults instantiates a new TransactRequestFromTokenExtensions object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetBridgeInfo

`func (o *TransactRequestFromTokenExtensions) GetBridgeInfo() map[string]TransactRequestFromTokenExtensionsBridgeInfoValue`

GetBridgeInfo returns the BridgeInfo field if non-nil, zero value otherwise.

### GetBridgeInfoOk

`func (o *TransactRequestFromTokenExtensions) GetBridgeInfoOk() (*map[string]TransactRequestFromTokenExtensionsBridgeInfoValue, bool)`

GetBridgeInfoOk returns a tuple with the BridgeInfo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBridgeInfo

`func (o *TransactRequestFromTokenExtensions) SetBridgeInfo(v map[string]TransactRequestFromTokenExtensionsBridgeInfoValue)`

SetBridgeInfo sets BridgeInfo field to given value.

### HasBridgeInfo

`func (o *TransactRequestFromTokenExtensions) HasBridgeInfo() bool`

HasBridgeInfo returns a boolean if a field has been set.

### GetVerified

`func (o *TransactRequestFromTokenExtensions) GetVerified() bool`

GetVerified returns the Verified field if non-nil, zero value otherwise.

### GetVerifiedOk

`func (o *TransactRequestFromTokenExtensions) GetVerifiedOk() (*bool, bool)`

GetVerifiedOk returns a tuple with the Verified field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVerified

`func (o *TransactRequestFromTokenExtensions) SetVerified(v bool)`

SetVerified sets Verified field to given value.

### HasVerified

`func (o *TransactRequestFromTokenExtensions) HasVerified() bool`

HasVerified returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


