# GetRoutes200ResponseRoutesInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier of the route. | 
**GatewayID** | **string** | A unique identifier for the gateway. | 
**Mode** | **string** | The mode of operation for this route - &#39;data&#39; for arbitrary payload handling, &#39;transfer&#39; for asset transfer. | 
**FromDLTNetworkID** | Pointer to **string** | The ID of the DLT Network where the operation will originate. | [optional] 
**FromAmountUSD** | Pointer to **float64** | The amount of &#39;fromToken&#39; to be transferred in USD, specified as a string to maintain precision. | [optional] 
**FromAmount** | Pointer to **string** | The amount that should be sent including all decimals (e.g., 1000000 for 1 USDC (6 decimals)). | [optional] 
**FromToken** | Pointer to [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] 
**ToDLTNetworkID** | Pointer to **string** | The ID of the DLT Network where the operation will end. | [optional] 
**ToAmountUSD** | Pointer to **string** | The expected amount to be received in USD. | [optional] 
**ToAmount** | Pointer to **string** | The expected amount to be received including all decimals (e.g., 1000000 for 1 USDC (6 decimals)). | [optional] 
**ToAmountMin** | Pointer to **string** | The minimum expected amount to be received including all decimals (e.g., 1000000 for 1 USDC (6 decimals)). | [optional] 
**ToToken** | Pointer to [**GetRoutes200ResponseRoutesInnerFromToken**](GetRoutes200ResponseRoutesInnerFromToken.md) |  | [optional] 
**GasCostUSD** | Pointer to **string** | The expected gas cost in USD. | [optional] 
**ContainsSwitchChain** | Pointer to **bool** | Whether chain switching is enabled or not. | [optional] 
**Steps** | Pointer to [**[]GetRoutes200ResponseRoutesInnerStepsInner**](GetRoutes200ResponseRoutesInnerStepsInner.md) | List of steps involved in this route, adjusted for mode. | [optional] 
**Insurance** | Pointer to [**GetRoutes200ResponseRoutesInnerInsurance**](GetRoutes200ResponseRoutesInnerInsurance.md) |  | [optional] 
**Tags** | Pointer to **[]string** | List of tags identifiers providing additional context or categorization. | [optional] 

## Methods

### NewGetRoutes200ResponseRoutesInner

`func NewGetRoutes200ResponseRoutesInner(id string, gatewayID string, mode string, ) *GetRoutes200ResponseRoutesInner`

NewGetRoutes200ResponseRoutesInner instantiates a new GetRoutes200ResponseRoutesInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetRoutes200ResponseRoutesInnerWithDefaults

`func NewGetRoutes200ResponseRoutesInnerWithDefaults() *GetRoutes200ResponseRoutesInner`

NewGetRoutes200ResponseRoutesInnerWithDefaults instantiates a new GetRoutes200ResponseRoutesInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *GetRoutes200ResponseRoutesInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *GetRoutes200ResponseRoutesInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *GetRoutes200ResponseRoutesInner) SetId(v string)`

SetId sets Id field to given value.


### GetGatewayID

`func (o *GetRoutes200ResponseRoutesInner) GetGatewayID() string`

GetGatewayID returns the GatewayID field if non-nil, zero value otherwise.

### GetGatewayIDOk

`func (o *GetRoutes200ResponseRoutesInner) GetGatewayIDOk() (*string, bool)`

GetGatewayIDOk returns a tuple with the GatewayID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGatewayID

`func (o *GetRoutes200ResponseRoutesInner) SetGatewayID(v string)`

SetGatewayID sets GatewayID field to given value.


### GetMode

`func (o *GetRoutes200ResponseRoutesInner) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *GetRoutes200ResponseRoutesInner) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *GetRoutes200ResponseRoutesInner) SetMode(v string)`

SetMode sets Mode field to given value.


### GetFromDLTNetworkID

`func (o *GetRoutes200ResponseRoutesInner) GetFromDLTNetworkID() string`

GetFromDLTNetworkID returns the FromDLTNetworkID field if non-nil, zero value otherwise.

### GetFromDLTNetworkIDOk

`func (o *GetRoutes200ResponseRoutesInner) GetFromDLTNetworkIDOk() (*string, bool)`

GetFromDLTNetworkIDOk returns a tuple with the FromDLTNetworkID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromDLTNetworkID

`func (o *GetRoutes200ResponseRoutesInner) SetFromDLTNetworkID(v string)`

SetFromDLTNetworkID sets FromDLTNetworkID field to given value.

### HasFromDLTNetworkID

`func (o *GetRoutes200ResponseRoutesInner) HasFromDLTNetworkID() bool`

HasFromDLTNetworkID returns a boolean if a field has been set.

### GetFromAmountUSD

`func (o *GetRoutes200ResponseRoutesInner) GetFromAmountUSD() float64`

GetFromAmountUSD returns the FromAmountUSD field if non-nil, zero value otherwise.

### GetFromAmountUSDOk

`func (o *GetRoutes200ResponseRoutesInner) GetFromAmountUSDOk() (*float64, bool)`

GetFromAmountUSDOk returns a tuple with the FromAmountUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmountUSD

`func (o *GetRoutes200ResponseRoutesInner) SetFromAmountUSD(v float64)`

SetFromAmountUSD sets FromAmountUSD field to given value.

### HasFromAmountUSD

`func (o *GetRoutes200ResponseRoutesInner) HasFromAmountUSD() bool`

HasFromAmountUSD returns a boolean if a field has been set.

### GetFromAmount

`func (o *GetRoutes200ResponseRoutesInner) GetFromAmount() string`

GetFromAmount returns the FromAmount field if non-nil, zero value otherwise.

### GetFromAmountOk

`func (o *GetRoutes200ResponseRoutesInner) GetFromAmountOk() (*string, bool)`

GetFromAmountOk returns a tuple with the FromAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromAmount

`func (o *GetRoutes200ResponseRoutesInner) SetFromAmount(v string)`

SetFromAmount sets FromAmount field to given value.

### HasFromAmount

`func (o *GetRoutes200ResponseRoutesInner) HasFromAmount() bool`

HasFromAmount returns a boolean if a field has been set.

### GetFromToken

`func (o *GetRoutes200ResponseRoutesInner) GetFromToken() GetRoutes200ResponseRoutesInnerFromToken`

GetFromToken returns the FromToken field if non-nil, zero value otherwise.

### GetFromTokenOk

`func (o *GetRoutes200ResponseRoutesInner) GetFromTokenOk() (*GetRoutes200ResponseRoutesInnerFromToken, bool)`

GetFromTokenOk returns a tuple with the FromToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFromToken

`func (o *GetRoutes200ResponseRoutesInner) SetFromToken(v GetRoutes200ResponseRoutesInnerFromToken)`

SetFromToken sets FromToken field to given value.

### HasFromToken

`func (o *GetRoutes200ResponseRoutesInner) HasFromToken() bool`

HasFromToken returns a boolean if a field has been set.

### GetToDLTNetworkID

`func (o *GetRoutes200ResponseRoutesInner) GetToDLTNetworkID() string`

GetToDLTNetworkID returns the ToDLTNetworkID field if non-nil, zero value otherwise.

### GetToDLTNetworkIDOk

`func (o *GetRoutes200ResponseRoutesInner) GetToDLTNetworkIDOk() (*string, bool)`

GetToDLTNetworkIDOk returns a tuple with the ToDLTNetworkID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToDLTNetworkID

`func (o *GetRoutes200ResponseRoutesInner) SetToDLTNetworkID(v string)`

SetToDLTNetworkID sets ToDLTNetworkID field to given value.

### HasToDLTNetworkID

`func (o *GetRoutes200ResponseRoutesInner) HasToDLTNetworkID() bool`

HasToDLTNetworkID returns a boolean if a field has been set.

### GetToAmountUSD

`func (o *GetRoutes200ResponseRoutesInner) GetToAmountUSD() string`

GetToAmountUSD returns the ToAmountUSD field if non-nil, zero value otherwise.

### GetToAmountUSDOk

`func (o *GetRoutes200ResponseRoutesInner) GetToAmountUSDOk() (*string, bool)`

GetToAmountUSDOk returns a tuple with the ToAmountUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmountUSD

`func (o *GetRoutes200ResponseRoutesInner) SetToAmountUSD(v string)`

SetToAmountUSD sets ToAmountUSD field to given value.

### HasToAmountUSD

`func (o *GetRoutes200ResponseRoutesInner) HasToAmountUSD() bool`

HasToAmountUSD returns a boolean if a field has been set.

### GetToAmount

`func (o *GetRoutes200ResponseRoutesInner) GetToAmount() string`

GetToAmount returns the ToAmount field if non-nil, zero value otherwise.

### GetToAmountOk

`func (o *GetRoutes200ResponseRoutesInner) GetToAmountOk() (*string, bool)`

GetToAmountOk returns a tuple with the ToAmount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmount

`func (o *GetRoutes200ResponseRoutesInner) SetToAmount(v string)`

SetToAmount sets ToAmount field to given value.

### HasToAmount

`func (o *GetRoutes200ResponseRoutesInner) HasToAmount() bool`

HasToAmount returns a boolean if a field has been set.

### GetToAmountMin

`func (o *GetRoutes200ResponseRoutesInner) GetToAmountMin() string`

GetToAmountMin returns the ToAmountMin field if non-nil, zero value otherwise.

### GetToAmountMinOk

`func (o *GetRoutes200ResponseRoutesInner) GetToAmountMinOk() (*string, bool)`

GetToAmountMinOk returns a tuple with the ToAmountMin field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToAmountMin

`func (o *GetRoutes200ResponseRoutesInner) SetToAmountMin(v string)`

SetToAmountMin sets ToAmountMin field to given value.

### HasToAmountMin

`func (o *GetRoutes200ResponseRoutesInner) HasToAmountMin() bool`

HasToAmountMin returns a boolean if a field has been set.

### GetToToken

`func (o *GetRoutes200ResponseRoutesInner) GetToToken() GetRoutes200ResponseRoutesInnerFromToken`

GetToToken returns the ToToken field if non-nil, zero value otherwise.

### GetToTokenOk

`func (o *GetRoutes200ResponseRoutesInner) GetToTokenOk() (*GetRoutes200ResponseRoutesInnerFromToken, bool)`

GetToTokenOk returns a tuple with the ToToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToToken

`func (o *GetRoutes200ResponseRoutesInner) SetToToken(v GetRoutes200ResponseRoutesInnerFromToken)`

SetToToken sets ToToken field to given value.

### HasToToken

`func (o *GetRoutes200ResponseRoutesInner) HasToToken() bool`

HasToToken returns a boolean if a field has been set.

### GetGasCostUSD

`func (o *GetRoutes200ResponseRoutesInner) GetGasCostUSD() string`

GetGasCostUSD returns the GasCostUSD field if non-nil, zero value otherwise.

### GetGasCostUSDOk

`func (o *GetRoutes200ResponseRoutesInner) GetGasCostUSDOk() (*string, bool)`

GetGasCostUSDOk returns a tuple with the GasCostUSD field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGasCostUSD

`func (o *GetRoutes200ResponseRoutesInner) SetGasCostUSD(v string)`

SetGasCostUSD sets GasCostUSD field to given value.

### HasGasCostUSD

`func (o *GetRoutes200ResponseRoutesInner) HasGasCostUSD() bool`

HasGasCostUSD returns a boolean if a field has been set.

### GetContainsSwitchChain

`func (o *GetRoutes200ResponseRoutesInner) GetContainsSwitchChain() bool`

GetContainsSwitchChain returns the ContainsSwitchChain field if non-nil, zero value otherwise.

### GetContainsSwitchChainOk

`func (o *GetRoutes200ResponseRoutesInner) GetContainsSwitchChainOk() (*bool, bool)`

GetContainsSwitchChainOk returns a tuple with the ContainsSwitchChain field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainsSwitchChain

`func (o *GetRoutes200ResponseRoutesInner) SetContainsSwitchChain(v bool)`

SetContainsSwitchChain sets ContainsSwitchChain field to given value.

### HasContainsSwitchChain

`func (o *GetRoutes200ResponseRoutesInner) HasContainsSwitchChain() bool`

HasContainsSwitchChain returns a boolean if a field has been set.

### GetSteps

`func (o *GetRoutes200ResponseRoutesInner) GetSteps() []GetRoutes200ResponseRoutesInnerStepsInner`

GetSteps returns the Steps field if non-nil, zero value otherwise.

### GetStepsOk

`func (o *GetRoutes200ResponseRoutesInner) GetStepsOk() (*[]GetRoutes200ResponseRoutesInnerStepsInner, bool)`

GetStepsOk returns a tuple with the Steps field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSteps

`func (o *GetRoutes200ResponseRoutesInner) SetSteps(v []GetRoutes200ResponseRoutesInnerStepsInner)`

SetSteps sets Steps field to given value.

### HasSteps

`func (o *GetRoutes200ResponseRoutesInner) HasSteps() bool`

HasSteps returns a boolean if a field has been set.

### GetInsurance

`func (o *GetRoutes200ResponseRoutesInner) GetInsurance() GetRoutes200ResponseRoutesInnerInsurance`

GetInsurance returns the Insurance field if non-nil, zero value otherwise.

### GetInsuranceOk

`func (o *GetRoutes200ResponseRoutesInner) GetInsuranceOk() (*GetRoutes200ResponseRoutesInnerInsurance, bool)`

GetInsuranceOk returns a tuple with the Insurance field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInsurance

`func (o *GetRoutes200ResponseRoutesInner) SetInsurance(v GetRoutes200ResponseRoutesInnerInsurance)`

SetInsurance sets Insurance field to given value.

### HasInsurance

`func (o *GetRoutes200ResponseRoutesInner) HasInsurance() bool`

HasInsurance returns a boolean if a field has been set.

### GetTags

`func (o *GetRoutes200ResponseRoutesInner) GetTags() []string`

GetTags returns the Tags field if non-nil, zero value otherwise.

### GetTagsOk

`func (o *GetRoutes200ResponseRoutesInner) GetTagsOk() (*[]string, bool)`

GetTagsOk returns a tuple with the Tags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTags

`func (o *GetRoutes200ResponseRoutesInner) SetTags(v []string)`

SetTags sets Tags field to given value.

### HasTags

`func (o *GetRoutes200ResponseRoutesInner) HasTags() bool`

HasTags returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


