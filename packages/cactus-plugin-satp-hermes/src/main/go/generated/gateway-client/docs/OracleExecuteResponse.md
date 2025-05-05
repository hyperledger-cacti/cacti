# OracleExecuteResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskID** | Pointer to **string** | The unique identifier of the task. | [optional] 
**Type** | [**Enum**](enum.md) | The type of the Oracle task. | 
**SrcNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SrcContract** | [**ExecuteOracleTask200ResponseSrcContract**](ExecuteOracleTask200ResponseSrcContract.md) |  | 
**DstNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DstContract** | [**ExecuteOracleTask200ResponseDstContract**](ExecuteOracleTask200ResponseDstContract.md) |  | 
**Timestamp** | **int64** | The timestamp when the Oracle task was created or last updated. | 
**Operations** | [**[]ExecuteOracleTask200ResponseOperationsInner**](ExecuteOracleTask200ResponseOperationsInner.md) | The list of operations performed by the Oracle task. | 
**Status** | [**Enum**](enum.md) | The current status of the Oracle task. | 
**Mode** | **string** | The mode of operation for registered tasks. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 

## Methods

### NewOracleExecuteResponse

`func NewOracleExecuteResponse(type_ Enum, srcContract ExecuteOracleTask200ResponseSrcContract, dstContract ExecuteOracleTask200ResponseDstContract, timestamp int64, operations []ExecuteOracleTask200ResponseOperationsInner, status Enum, mode string, ) *OracleExecuteResponse`

NewOracleExecuteResponse instantiates a new OracleExecuteResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleExecuteResponseWithDefaults

`func NewOracleExecuteResponseWithDefaults() *OracleExecuteResponse`

NewOracleExecuteResponseWithDefaults instantiates a new OracleExecuteResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskID

`func (o *OracleExecuteResponse) GetTaskID() string`

GetTaskID returns the TaskID field if non-nil, zero value otherwise.

### GetTaskIDOk

`func (o *OracleExecuteResponse) GetTaskIDOk() (*string, bool)`

GetTaskIDOk returns a tuple with the TaskID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskID

`func (o *OracleExecuteResponse) SetTaskID(v string)`

SetTaskID sets TaskID field to given value.

### HasTaskID

`func (o *OracleExecuteResponse) HasTaskID() bool`

HasTaskID returns a boolean if a field has been set.

### GetType

`func (o *OracleExecuteResponse) GetType() Enum`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleExecuteResponse) GetTypeOk() (*Enum, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleExecuteResponse) SetType(v Enum)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *OracleExecuteResponse) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *OracleExecuteResponse) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *OracleExecuteResponse) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *OracleExecuteResponse) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *OracleExecuteResponse) GetSrcContract() ExecuteOracleTask200ResponseSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *OracleExecuteResponse) GetSrcContractOk() (*ExecuteOracleTask200ResponseSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *OracleExecuteResponse) SetSrcContract(v ExecuteOracleTask200ResponseSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *OracleExecuteResponse) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *OracleExecuteResponse) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *OracleExecuteResponse) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *OracleExecuteResponse) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *OracleExecuteResponse) GetDstContract() ExecuteOracleTask200ResponseDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *OracleExecuteResponse) GetDstContractOk() (*ExecuteOracleTask200ResponseDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *OracleExecuteResponse) SetDstContract(v ExecuteOracleTask200ResponseDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *OracleExecuteResponse) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleExecuteResponse) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleExecuteResponse) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *OracleExecuteResponse) GetOperations() []ExecuteOracleTask200ResponseOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *OracleExecuteResponse) GetOperationsOk() (*[]ExecuteOracleTask200ResponseOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *OracleExecuteResponse) SetOperations(v []ExecuteOracleTask200ResponseOperationsInner)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *OracleExecuteResponse) GetStatus() Enum`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleExecuteResponse) GetStatusOk() (*Enum, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleExecuteResponse) SetStatus(v Enum)`

SetStatus sets Status field to given value.


### GetMode

`func (o *OracleExecuteResponse) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *OracleExecuteResponse) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *OracleExecuteResponse) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *OracleExecuteResponse) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *OracleExecuteResponse) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *OracleExecuteResponse) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *OracleExecuteResponse) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


