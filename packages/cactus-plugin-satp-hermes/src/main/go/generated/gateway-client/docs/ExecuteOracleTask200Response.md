# ExecuteOracleTask200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskID** | **string** | The unique identifier of the task. | 
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

## Methods

### NewExecuteOracleTask200Response

`func NewExecuteOracleTask200Response(taskID string, type_ string, srcContract ExecuteOracleTask200ResponseSrcContract, dstContract ExecuteOracleTask200ResponseDstContract, timestamp int64, operations []ExecuteOracleTask200ResponseOperationsInner, status string, mode string, ) *ExecuteOracleTask200Response`

NewExecuteOracleTask200Response instantiates a new ExecuteOracleTask200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewExecuteOracleTask200ResponseWithDefaults

`func NewExecuteOracleTask200ResponseWithDefaults() *ExecuteOracleTask200Response`

NewExecuteOracleTask200ResponseWithDefaults instantiates a new ExecuteOracleTask200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskID

`func (o *ExecuteOracleTask200Response) GetTaskID() string`

GetTaskID returns the TaskID field if non-nil, zero value otherwise.

### GetTaskIDOk

`func (o *ExecuteOracleTask200Response) GetTaskIDOk() (*string, bool)`

GetTaskIDOk returns a tuple with the TaskID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskID

`func (o *ExecuteOracleTask200Response) SetTaskID(v string)`

SetTaskID sets TaskID field to given value.


### GetType

`func (o *ExecuteOracleTask200Response) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *ExecuteOracleTask200Response) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *ExecuteOracleTask200Response) SetType(v string)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *ExecuteOracleTask200Response) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *ExecuteOracleTask200Response) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *ExecuteOracleTask200Response) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *ExecuteOracleTask200Response) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *ExecuteOracleTask200Response) GetSrcContract() ExecuteOracleTask200ResponseSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *ExecuteOracleTask200Response) GetSrcContractOk() (*ExecuteOracleTask200ResponseSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *ExecuteOracleTask200Response) SetSrcContract(v ExecuteOracleTask200ResponseSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *ExecuteOracleTask200Response) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *ExecuteOracleTask200Response) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *ExecuteOracleTask200Response) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *ExecuteOracleTask200Response) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *ExecuteOracleTask200Response) GetDstContract() ExecuteOracleTask200ResponseDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *ExecuteOracleTask200Response) GetDstContractOk() (*ExecuteOracleTask200ResponseDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *ExecuteOracleTask200Response) SetDstContract(v ExecuteOracleTask200ResponseDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *ExecuteOracleTask200Response) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *ExecuteOracleTask200Response) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *ExecuteOracleTask200Response) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *ExecuteOracleTask200Response) GetOperations() []ExecuteOracleTask200ResponseOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *ExecuteOracleTask200Response) GetOperationsOk() (*[]ExecuteOracleTask200ResponseOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *ExecuteOracleTask200Response) SetOperations(v []ExecuteOracleTask200ResponseOperationsInner)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *ExecuteOracleTask200Response) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *ExecuteOracleTask200Response) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *ExecuteOracleTask200Response) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetMode

`func (o *ExecuteOracleTask200Response) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *ExecuteOracleTask200Response) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *ExecuteOracleTask200Response) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *ExecuteOracleTask200Response) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *ExecuteOracleTask200Response) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *ExecuteOracleTask200Response) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *ExecuteOracleTask200Response) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


