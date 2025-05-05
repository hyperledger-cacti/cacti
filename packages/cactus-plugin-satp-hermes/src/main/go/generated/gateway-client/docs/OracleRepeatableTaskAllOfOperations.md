# OracleRepeatableTaskAllOfOperations

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**OracleRepeatableTaskAllOfSrcNetworkId**](OracleRepeatableTaskAllOfSrcNetworkId.md) |  | 
**Contract** | [**OracleRepeatableTaskAllOfContract**](OracleRepeatableTaskAllOfContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**OracleRepeatableTaskAllOfOutput**](OracleRepeatableTaskAllOfOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewOracleRepeatableTaskAllOfOperations

`func NewOracleRepeatableTaskAllOfOperations(id string, type_ string, networkId OracleRepeatableTaskAllOfSrcNetworkId, contract OracleRepeatableTaskAllOfContract, status string, timestamp int64, ) *OracleRepeatableTaskAllOfOperations`

NewOracleRepeatableTaskAllOfOperations instantiates a new OracleRepeatableTaskAllOfOperations object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRepeatableTaskAllOfOperationsWithDefaults

`func NewOracleRepeatableTaskAllOfOperationsWithDefaults() *OracleRepeatableTaskAllOfOperations`

NewOracleRepeatableTaskAllOfOperationsWithDefaults instantiates a new OracleRepeatableTaskAllOfOperations object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleRepeatableTaskAllOfOperations) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleRepeatableTaskAllOfOperations) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleRepeatableTaskAllOfOperations) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleRepeatableTaskAllOfOperations) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleRepeatableTaskAllOfOperations) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleRepeatableTaskAllOfOperations) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *OracleRepeatableTaskAllOfOperations) GetNetworkId() OracleRepeatableTaskAllOfSrcNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *OracleRepeatableTaskAllOfOperations) GetNetworkIdOk() (*OracleRepeatableTaskAllOfSrcNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *OracleRepeatableTaskAllOfOperations) SetNetworkId(v OracleRepeatableTaskAllOfSrcNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *OracleRepeatableTaskAllOfOperations) GetContract() OracleRepeatableTaskAllOfContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *OracleRepeatableTaskAllOfOperations) GetContractOk() (*OracleRepeatableTaskAllOfContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *OracleRepeatableTaskAllOfOperations) SetContract(v OracleRepeatableTaskAllOfContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *OracleRepeatableTaskAllOfOperations) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleRepeatableTaskAllOfOperations) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleRepeatableTaskAllOfOperations) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *OracleRepeatableTaskAllOfOperations) GetOutput() OracleRepeatableTaskAllOfOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleRepeatableTaskAllOfOperations) GetOutputOk() (*OracleRepeatableTaskAllOfOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleRepeatableTaskAllOfOperations) SetOutput(v OracleRepeatableTaskAllOfOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleRepeatableTaskAllOfOperations) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleRepeatableTaskAllOfOperations) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleRepeatableTaskAllOfOperations) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleRepeatableTaskAllOfOperations) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


