# ExecuteOracleTask200ResponseOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**ExecuteOracleTask200ResponseOperationsInnerContract**](ExecuteOracleTask200ResponseOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**ExecuteOracleTask200ResponseOperationsInnerOutput**](ExecuteOracleTask200ResponseOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewExecuteOracleTask200ResponseOperationsInner

`func NewExecuteOracleTask200ResponseOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract ExecuteOracleTask200ResponseOperationsInnerContract, status string, timestamp int64, ) *ExecuteOracleTask200ResponseOperationsInner`

NewExecuteOracleTask200ResponseOperationsInner instantiates a new ExecuteOracleTask200ResponseOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewExecuteOracleTask200ResponseOperationsInnerWithDefaults

`func NewExecuteOracleTask200ResponseOperationsInnerWithDefaults() *ExecuteOracleTask200ResponseOperationsInner`

NewExecuteOracleTask200ResponseOperationsInnerWithDefaults instantiates a new ExecuteOracleTask200ResponseOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ExecuteOracleTask200ResponseOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *ExecuteOracleTask200ResponseOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *ExecuteOracleTask200ResponseOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetContract() ExecuteOracleTask200ResponseOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetContractOk() (*ExecuteOracleTask200ResponseOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *ExecuteOracleTask200ResponseOperationsInner) SetContract(v ExecuteOracleTask200ResponseOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *ExecuteOracleTask200ResponseOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetOutput() ExecuteOracleTask200ResponseOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetOutputOk() (*ExecuteOracleTask200ResponseOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *ExecuteOracleTask200ResponseOperationsInner) SetOutput(v ExecuteOracleTask200ResponseOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *ExecuteOracleTask200ResponseOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *ExecuteOracleTask200ResponseOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *ExecuteOracleTask200ResponseOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


