# OracleRepeatableTaskAllOf

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle task. | 
**Type** | [**Enum**](enum.md) | The type of the Oracle task. | 
**SrcNetworkId** | Pointer to [**OracleRepeatableTaskAllOfSrcNetworkId**](OracleRepeatableTaskAllOfSrcNetworkId.md) |  | [optional] 
**SrcContract** | [**OracleRepeatableTaskAllOfSrcContract**](OracleRepeatableTaskAllOfSrcContract.md) |  | 
**DstNetworkId** | Pointer to [**OracleRepeatableTaskAllOfSrcNetworkId**](OracleRepeatableTaskAllOfSrcNetworkId.md) |  | [optional] 
**DstContract** | [**OracleRepeatableTaskAllOfDstContract**](OracleRepeatableTaskAllOfDstContract.md) |  | 
**Timestamp** | **int64** | The timestamp when the Oracle task was created or last updated. | 
**Operations** | [**[]OracleRepeatableTaskAllOfOperations**](OracleRepeatableTaskAllOfOperations.md) | The list of operations performed by the Oracle task. | 
**Status** | [**Enum**](enum.md) | The current status of the Oracle task. | 

## Methods

### NewOracleRepeatableTaskAllOf

`func NewOracleRepeatableTaskAllOf(id string, type_ Enum, srcContract OracleRepeatableTaskAllOfSrcContract, dstContract OracleRepeatableTaskAllOfDstContract, timestamp int64, operations []OracleRepeatableTaskAllOfOperations, status Enum, ) *OracleRepeatableTaskAllOf`

NewOracleRepeatableTaskAllOf instantiates a new OracleRepeatableTaskAllOf object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRepeatableTaskAllOfWithDefaults

`func NewOracleRepeatableTaskAllOfWithDefaults() *OracleRepeatableTaskAllOf`

NewOracleRepeatableTaskAllOfWithDefaults instantiates a new OracleRepeatableTaskAllOf object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleRepeatableTaskAllOf) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleRepeatableTaskAllOf) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleRepeatableTaskAllOf) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleRepeatableTaskAllOf) GetType() Enum`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleRepeatableTaskAllOf) GetTypeOk() (*Enum, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleRepeatableTaskAllOf) SetType(v Enum)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *OracleRepeatableTaskAllOf) GetSrcNetworkId() OracleRepeatableTaskAllOfSrcNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *OracleRepeatableTaskAllOf) GetSrcNetworkIdOk() (*OracleRepeatableTaskAllOfSrcNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *OracleRepeatableTaskAllOf) SetSrcNetworkId(v OracleRepeatableTaskAllOfSrcNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *OracleRepeatableTaskAllOf) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *OracleRepeatableTaskAllOf) GetSrcContract() OracleRepeatableTaskAllOfSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *OracleRepeatableTaskAllOf) GetSrcContractOk() (*OracleRepeatableTaskAllOfSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *OracleRepeatableTaskAllOf) SetSrcContract(v OracleRepeatableTaskAllOfSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *OracleRepeatableTaskAllOf) GetDstNetworkId() OracleRepeatableTaskAllOfSrcNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *OracleRepeatableTaskAllOf) GetDstNetworkIdOk() (*OracleRepeatableTaskAllOfSrcNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *OracleRepeatableTaskAllOf) SetDstNetworkId(v OracleRepeatableTaskAllOfSrcNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *OracleRepeatableTaskAllOf) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *OracleRepeatableTaskAllOf) GetDstContract() OracleRepeatableTaskAllOfDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *OracleRepeatableTaskAllOf) GetDstContractOk() (*OracleRepeatableTaskAllOfDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *OracleRepeatableTaskAllOf) SetDstContract(v OracleRepeatableTaskAllOfDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *OracleRepeatableTaskAllOf) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleRepeatableTaskAllOf) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleRepeatableTaskAllOf) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *OracleRepeatableTaskAllOf) GetOperations() []OracleRepeatableTaskAllOfOperations`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *OracleRepeatableTaskAllOf) GetOperationsOk() (*[]OracleRepeatableTaskAllOfOperations, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *OracleRepeatableTaskAllOf) SetOperations(v []OracleRepeatableTaskAllOfOperations)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *OracleRepeatableTaskAllOf) GetStatus() Enum`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleRepeatableTaskAllOf) GetStatusOk() (*Enum, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleRepeatableTaskAllOf) SetStatus(v Enum)`

SetStatus sets Status field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


