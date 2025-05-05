# ExecuteOracleTask200ResponseAllOf

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle task. | 
**Type** | [**Enum**](enum.md) | The type of the Oracle task. | 
**SrcNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SrcContract** | [**ExecuteOracleTask200ResponseAllOfSrcContract**](ExecuteOracleTask200ResponseAllOfSrcContract.md) |  | 
**DstNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DstContract** | [**ExecuteOracleTask200ResponseAllOfDstContract**](ExecuteOracleTask200ResponseAllOfDstContract.md) |  | 
**Timestamp** | **int64** | The timestamp when the Oracle task was created or last updated. | 
**Operations** | [**[]ExecuteOracleTask200ResponseAllOfOperationsInner**](ExecuteOracleTask200ResponseAllOfOperationsInner.md) | The list of operations performed by the Oracle task. | 
**Status** | [**Enum**](enum.md) | The current status of the Oracle task. | 
**Mode** | **string** | The mode of operation for registered tasks. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 

## Methods

### NewExecuteOracleTask200ResponseAllOf

`func NewExecuteOracleTask200ResponseAllOf(id string, type_ Enum, srcContract ExecuteOracleTask200ResponseAllOfSrcContract, dstContract ExecuteOracleTask200ResponseAllOfDstContract, timestamp int64, operations []ExecuteOracleTask200ResponseAllOfOperationsInner, status Enum, mode string, ) *ExecuteOracleTask200ResponseAllOf`

NewExecuteOracleTask200ResponseAllOf instantiates a new ExecuteOracleTask200ResponseAllOf object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewExecuteOracleTask200ResponseAllOfWithDefaults

`func NewExecuteOracleTask200ResponseAllOfWithDefaults() *ExecuteOracleTask200ResponseAllOf`

NewExecuteOracleTask200ResponseAllOfWithDefaults instantiates a new ExecuteOracleTask200ResponseAllOf object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ExecuteOracleTask200ResponseAllOf) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ExecuteOracleTask200ResponseAllOf) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *ExecuteOracleTask200ResponseAllOf) GetType() Enum`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetTypeOk() (*Enum, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *ExecuteOracleTask200ResponseAllOf) SetType(v Enum)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *ExecuteOracleTask200ResponseAllOf) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *ExecuteOracleTask200ResponseAllOf) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *ExecuteOracleTask200ResponseAllOf) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *ExecuteOracleTask200ResponseAllOf) GetSrcContract() ExecuteOracleTask200ResponseAllOfSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetSrcContractOk() (*ExecuteOracleTask200ResponseAllOfSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *ExecuteOracleTask200ResponseAllOf) SetSrcContract(v ExecuteOracleTask200ResponseAllOfSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *ExecuteOracleTask200ResponseAllOf) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *ExecuteOracleTask200ResponseAllOf) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *ExecuteOracleTask200ResponseAllOf) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *ExecuteOracleTask200ResponseAllOf) GetDstContract() ExecuteOracleTask200ResponseAllOfDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetDstContractOk() (*ExecuteOracleTask200ResponseAllOfDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *ExecuteOracleTask200ResponseAllOf) SetDstContract(v ExecuteOracleTask200ResponseAllOfDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *ExecuteOracleTask200ResponseAllOf) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *ExecuteOracleTask200ResponseAllOf) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *ExecuteOracleTask200ResponseAllOf) GetOperations() []ExecuteOracleTask200ResponseAllOfOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetOperationsOk() (*[]ExecuteOracleTask200ResponseAllOfOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *ExecuteOracleTask200ResponseAllOf) SetOperations(v []ExecuteOracleTask200ResponseAllOfOperationsInner)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *ExecuteOracleTask200ResponseAllOf) GetStatus() Enum`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetStatusOk() (*Enum, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *ExecuteOracleTask200ResponseAllOf) SetStatus(v Enum)`

SetStatus sets Status field to given value.


### GetMode

`func (o *ExecuteOracleTask200ResponseAllOf) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *ExecuteOracleTask200ResponseAllOf) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *ExecuteOracleTask200ResponseAllOf) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *ExecuteOracleTask200ResponseAllOf) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *ExecuteOracleTask200ResponseAllOf) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *ExecuteOracleTask200ResponseAllOf) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


