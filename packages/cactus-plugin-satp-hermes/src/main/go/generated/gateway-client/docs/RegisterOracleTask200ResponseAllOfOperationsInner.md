# RegisterOracleTask200ResponseAllOfOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**RegisterOracleTask200ResponseAllOfOperationsInnerContract**](RegisterOracleTask200ResponseAllOfOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**RegisterOracleTask200ResponseAllOfOperationsInnerOutput**](RegisterOracleTask200ResponseAllOfOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewRegisterOracleTask200ResponseAllOfOperationsInner

`func NewRegisterOracleTask200ResponseAllOfOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract RegisterOracleTask200ResponseAllOfOperationsInnerContract, status string, timestamp int64, ) *RegisterOracleTask200ResponseAllOfOperationsInner`

NewRegisterOracleTask200ResponseAllOfOperationsInner instantiates a new RegisterOracleTask200ResponseAllOfOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRegisterOracleTask200ResponseAllOfOperationsInnerWithDefaults

`func NewRegisterOracleTask200ResponseAllOfOperationsInnerWithDefaults() *RegisterOracleTask200ResponseAllOfOperationsInner`

NewRegisterOracleTask200ResponseAllOfOperationsInnerWithDefaults instantiates a new RegisterOracleTask200ResponseAllOfOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetContract() RegisterOracleTask200ResponseAllOfOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetContractOk() (*RegisterOracleTask200ResponseAllOfOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) SetContract(v RegisterOracleTask200ResponseAllOfOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetOutput() RegisterOracleTask200ResponseAllOfOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetOutputOk() (*RegisterOracleTask200ResponseAllOfOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) SetOutput(v RegisterOracleTask200ResponseAllOfOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *RegisterOracleTask200ResponseAllOfOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


