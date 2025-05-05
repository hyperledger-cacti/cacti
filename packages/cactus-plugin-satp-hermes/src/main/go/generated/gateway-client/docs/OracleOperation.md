# OracleOperation

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

### NewOracleOperation

`func NewOracleOperation(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract ExecuteOracleTask200ResponseOperationsInnerContract, status string, timestamp int64, ) *OracleOperation`

NewOracleOperation instantiates a new OracleOperation object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleOperationWithDefaults

`func NewOracleOperationWithDefaults() *OracleOperation`

NewOracleOperationWithDefaults instantiates a new OracleOperation object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleOperation) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleOperation) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleOperation) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleOperation) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleOperation) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleOperation) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *OracleOperation) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *OracleOperation) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *OracleOperation) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *OracleOperation) GetContract() ExecuteOracleTask200ResponseOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *OracleOperation) GetContractOk() (*ExecuteOracleTask200ResponseOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *OracleOperation) SetContract(v ExecuteOracleTask200ResponseOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *OracleOperation) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleOperation) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleOperation) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *OracleOperation) GetOutput() ExecuteOracleTask200ResponseOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleOperation) GetOutputOk() (*ExecuteOracleTask200ResponseOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleOperation) SetOutput(v ExecuteOracleTask200ResponseOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleOperation) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleOperation) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleOperation) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleOperation) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


