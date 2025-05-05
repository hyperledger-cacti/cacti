# ExecuteOracleTask200ResponseAllOfOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**ExecuteOracleTask200ResponseAllOfOperationsInnerContract**](ExecuteOracleTask200ResponseAllOfOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**ExecuteOracleTask200ResponseAllOfOperationsInnerOutput**](ExecuteOracleTask200ResponseAllOfOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewExecuteOracleTask200ResponseAllOfOperationsInner

`func NewExecuteOracleTask200ResponseAllOfOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract ExecuteOracleTask200ResponseAllOfOperationsInnerContract, status string, timestamp int64, ) *ExecuteOracleTask200ResponseAllOfOperationsInner`

NewExecuteOracleTask200ResponseAllOfOperationsInner instantiates a new ExecuteOracleTask200ResponseAllOfOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewExecuteOracleTask200ResponseAllOfOperationsInnerWithDefaults

`func NewExecuteOracleTask200ResponseAllOfOperationsInnerWithDefaults() *ExecuteOracleTask200ResponseAllOfOperationsInner`

NewExecuteOracleTask200ResponseAllOfOperationsInnerWithDefaults instantiates a new ExecuteOracleTask200ResponseAllOfOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetContract() ExecuteOracleTask200ResponseAllOfOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetContractOk() (*ExecuteOracleTask200ResponseAllOfOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) SetContract(v ExecuteOracleTask200ResponseAllOfOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetOutput() ExecuteOracleTask200ResponseAllOfOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetOutputOk() (*ExecuteOracleTask200ResponseAllOfOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) SetOutput(v ExecuteOracleTask200ResponseAllOfOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *ExecuteOracleTask200ResponseAllOfOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


