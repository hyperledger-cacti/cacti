# OracleExecuteRequest200ResponseOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**OracleExecuteRequest200ResponseOperationsInnerContract**](OracleExecuteRequest200ResponseOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**OracleExecuteRequest200ResponseOperationsInnerOutput**](OracleExecuteRequest200ResponseOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewOracleExecuteRequest200ResponseOperationsInner

`func NewOracleExecuteRequest200ResponseOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract OracleExecuteRequest200ResponseOperationsInnerContract, status string, timestamp int64, ) *OracleExecuteRequest200ResponseOperationsInner`

NewOracleExecuteRequest200ResponseOperationsInner instantiates a new OracleExecuteRequest200ResponseOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleExecuteRequest200ResponseOperationsInnerWithDefaults

`func NewOracleExecuteRequest200ResponseOperationsInnerWithDefaults() *OracleExecuteRequest200ResponseOperationsInner`

NewOracleExecuteRequest200ResponseOperationsInnerWithDefaults instantiates a new OracleExecuteRequest200ResponseOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleExecuteRequest200ResponseOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleExecuteRequest200ResponseOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *OracleExecuteRequest200ResponseOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetContract() OracleExecuteRequest200ResponseOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetContractOk() (*OracleExecuteRequest200ResponseOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *OracleExecuteRequest200ResponseOperationsInner) SetContract(v OracleExecuteRequest200ResponseOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleExecuteRequest200ResponseOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetOutput() OracleExecuteRequest200ResponseOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetOutputOk() (*OracleExecuteRequest200ResponseOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleExecuteRequest200ResponseOperationsInner) SetOutput(v OracleExecuteRequest200ResponseOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleExecuteRequest200ResponseOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleExecuteRequest200ResponseOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleExecuteRequest200ResponseOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


