# GetIntegrations200ResponseIntegrationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the blockchain network/system. | 
**Name** | **string** | The name of the blockchain network/system. | 
**Type** | **string** | The type of network (e.g., &#39;evm&#39;, &#39;fabric&#39;, &#39;SQL Database&#39;). | 
**Environment** | Pointer to **string** | The specific network name (e.g., &#39;mainnet&#39;, &#39;testnet&#39;). | [optional] 

## Methods

### NewGetIntegrations200ResponseIntegrationsInner

`func NewGetIntegrations200ResponseIntegrationsInner(id string, name string, type_ string, ) *GetIntegrations200ResponseIntegrationsInner`

NewGetIntegrations200ResponseIntegrationsInner instantiates a new GetIntegrations200ResponseIntegrationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetIntegrations200ResponseIntegrationsInnerWithDefaults

`func NewGetIntegrations200ResponseIntegrationsInnerWithDefaults() *GetIntegrations200ResponseIntegrationsInner`

NewGetIntegrations200ResponseIntegrationsInnerWithDefaults instantiates a new GetIntegrations200ResponseIntegrationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *GetIntegrations200ResponseIntegrationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *GetIntegrations200ResponseIntegrationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *GetIntegrations200ResponseIntegrationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetName

`func (o *GetIntegrations200ResponseIntegrationsInner) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *GetIntegrations200ResponseIntegrationsInner) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *GetIntegrations200ResponseIntegrationsInner) SetName(v string)`

SetName sets Name field to given value.


### GetType

`func (o *GetIntegrations200ResponseIntegrationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *GetIntegrations200ResponseIntegrationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *GetIntegrations200ResponseIntegrationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetEnvironment

`func (o *GetIntegrations200ResponseIntegrationsInner) GetEnvironment() string`

GetEnvironment returns the Environment field if non-nil, zero value otherwise.

### GetEnvironmentOk

`func (o *GetIntegrations200ResponseIntegrationsInner) GetEnvironmentOk() (*string, bool)`

GetEnvironmentOk returns a tuple with the Environment field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEnvironment

`func (o *GetIntegrations200ResponseIntegrationsInner) SetEnvironment(v string)`

SetEnvironment sets Environment field to given value.

### HasEnvironment

`func (o *GetIntegrations200ResponseIntegrationsInner) HasEnvironment() bool`

HasEnvironment returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


