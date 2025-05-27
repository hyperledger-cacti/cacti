# OracleTask

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskID** | **string** | Unique identifier (UUID) for the session. | 
**Type** | **string** | The type of the Oracle task. | 
**SrcNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SrcContract** | [**ExecuteOracleTask200ResponseSrcContract**](ExecuteOracleTask200ResponseSrcContract.md) |  | 
**DstNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DstContract** | [**ExecuteOracleTask200ResponseDstContract**](ExecuteOracleTask200ResponseDstContract.md) |  | 
**Timestamp** | **int64** | The timestamp when the Oracle task was created or last updated. | 
**Operations** | [**[]ExecuteOracleTask200ResponseOperationsInner**](ExecuteOracleTask200ResponseOperationsInner.md) | The list of operations performed by the Oracle task. | 
**Status** | **string** | The current status of the Oracle task. | 
**Mode** | **string** | The mode of operation for registered tasks. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 
**ListeningOptions** | Pointer to [**RegisterOracleTaskRequestListeningOptions**](RegisterOracleTaskRequestListeningOptions.md) |  | [optional] 

## Methods

### NewOracleTask

`func NewOracleTask(taskID string, type_ string, srcContract ExecuteOracleTask200ResponseSrcContract, dstContract ExecuteOracleTask200ResponseDstContract, timestamp int64, operations []ExecuteOracleTask200ResponseOperationsInner, status string, mode string, ) *OracleTask`

NewOracleTask instantiates a new OracleTask object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleTaskWithDefaults

`func NewOracleTaskWithDefaults() *OracleTask`

NewOracleTaskWithDefaults instantiates a new OracleTask object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskID

`func (o *OracleTask) GetTaskID() string`

GetTaskID returns the TaskID field if non-nil, zero value otherwise.

### GetTaskIDOk

`func (o *OracleTask) GetTaskIDOk() (*string, bool)`

GetTaskIDOk returns a tuple with the TaskID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskID

`func (o *OracleTask) SetTaskID(v string)`

SetTaskID sets TaskID field to given value.


### GetType

`func (o *OracleTask) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleTask) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleTask) SetType(v string)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *OracleTask) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *OracleTask) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *OracleTask) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *OracleTask) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *OracleTask) GetSrcContract() ExecuteOracleTask200ResponseSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *OracleTask) GetSrcContractOk() (*ExecuteOracleTask200ResponseSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *OracleTask) SetSrcContract(v ExecuteOracleTask200ResponseSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *OracleTask) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *OracleTask) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *OracleTask) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *OracleTask) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *OracleTask) GetDstContract() ExecuteOracleTask200ResponseDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *OracleTask) GetDstContractOk() (*ExecuteOracleTask200ResponseDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *OracleTask) SetDstContract(v ExecuteOracleTask200ResponseDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *OracleTask) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleTask) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleTask) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *OracleTask) GetOperations() []ExecuteOracleTask200ResponseOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *OracleTask) GetOperationsOk() (*[]ExecuteOracleTask200ResponseOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *OracleTask) SetOperations(v []ExecuteOracleTask200ResponseOperationsInner)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *OracleTask) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleTask) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleTask) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetMode

`func (o *OracleTask) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *OracleTask) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *OracleTask) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *OracleTask) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *OracleTask) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *OracleTask) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *OracleTask) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.

### GetListeningOptions

`func (o *OracleTask) GetListeningOptions() RegisterOracleTaskRequestListeningOptions`

GetListeningOptions returns the ListeningOptions field if non-nil, zero value otherwise.

### GetListeningOptionsOk

`func (o *OracleTask) GetListeningOptionsOk() (*RegisterOracleTaskRequestListeningOptions, bool)`

GetListeningOptionsOk returns a tuple with the ListeningOptions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetListeningOptions

`func (o *OracleTask) SetListeningOptions(v RegisterOracleTaskRequestListeningOptions)`

SetListeningOptions sets ListeningOptions field to given value.

### HasListeningOptions

`func (o *OracleTask) HasListeningOptions() bool`

HasListeningOptions returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


