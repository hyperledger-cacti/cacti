# GetChains200ResponseInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ChainId** | **string** | A unique identifier for the blockchain network. | 
**ChainName** | **string** | The name of the blockchain network. | 
**ChainType** | **string** | The type of blockchain network (e.g., &#39;evm&#39;, &#39;fabric&#39;). | 
**NetworkName** | **string** | The specific network name within the blockchain (e.g., &#39;mainnet&#39;, &#39;testnet&#39;). | 

## Methods

### NewGetChains200ResponseInner

`func NewGetChains200ResponseInner(chainId string, chainName string, chainType string, networkName string, ) *GetChains200ResponseInner`

NewGetChains200ResponseInner instantiates a new GetChains200ResponseInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetChains200ResponseInnerWithDefaults

`func NewGetChains200ResponseInnerWithDefaults() *GetChains200ResponseInner`

NewGetChains200ResponseInnerWithDefaults instantiates a new GetChains200ResponseInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChainId

`func (o *GetChains200ResponseInner) GetChainId() string`

GetChainId returns the ChainId field if non-nil, zero value otherwise.

### GetChainIdOk

`func (o *GetChains200ResponseInner) GetChainIdOk() (*string, bool)`

GetChainIdOk returns a tuple with the ChainId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChainId

`func (o *GetChains200ResponseInner) SetChainId(v string)`

SetChainId sets ChainId field to given value.


### GetChainName

`func (o *GetChains200ResponseInner) GetChainName() string`

GetChainName returns the ChainName field if non-nil, zero value otherwise.

### GetChainNameOk

`func (o *GetChains200ResponseInner) GetChainNameOk() (*string, bool)`

GetChainNameOk returns a tuple with the ChainName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChainName

`func (o *GetChains200ResponseInner) SetChainName(v string)`

SetChainName sets ChainName field to given value.


### GetChainType

`func (o *GetChains200ResponseInner) GetChainType() string`

GetChainType returns the ChainType field if non-nil, zero value otherwise.

### GetChainTypeOk

`func (o *GetChains200ResponseInner) GetChainTypeOk() (*string, bool)`

GetChainTypeOk returns a tuple with the ChainType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChainType

`func (o *GetChains200ResponseInner) SetChainType(v string)`

SetChainType sets ChainType field to given value.


### GetNetworkName

`func (o *GetChains200ResponseInner) GetNetworkName() string`

GetNetworkName returns the NetworkName field if non-nil, zero value otherwise.

### GetNetworkNameOk

`func (o *GetChains200ResponseInner) GetNetworkNameOk() (*string, bool)`

GetNetworkNameOk returns a tuple with the NetworkName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkName

`func (o *GetChains200ResponseInner) SetNetworkName(v string)`

SetNetworkName sets NetworkName field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


