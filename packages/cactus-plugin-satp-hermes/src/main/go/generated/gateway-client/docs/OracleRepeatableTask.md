# OracleRepeatableTask

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle task. | 
**Type** | Pointer to [**Enum**](enum.md) | The type of the Oracle task. | [optional] 
**SrcNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SrcContract** | Pointer to [**OracleRegisterRequest200ResponseSrcContract**](OracleRegisterRequest200ResponseSrcContract.md) |  | [optional] 
**DstNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DstContract** | Pointer to [**OracleRegisterRequest200ResponseDstContract**](OracleRegisterRequest200ResponseDstContract.md) |  | [optional] 
**Timestamp** | Pointer to **int64** | The timestamp when the Oracle task was created or last updated. | [optional] 
**Operations** | Pointer to [**[]OracleRegisterRequest200ResponseOperationsInner**](OracleRegisterRequest200ResponseOperationsInner.md) | The list of operations performed by the Oracle task. | [optional] 
**Status** | Pointer to [**Enum**](enum.md) | The current status of the Oracle task. | [optional] 
**Mode** | **string** | The mode of operation for the repeatable task. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 
**SourceEventSignature** | Pointer to **string** | The event signature to listen for on the source network. | [optional] 

## Methods

### NewOracleRepeatableTask

`func NewOracleRepeatableTask(id string, mode string, ) *OracleRepeatableTask`

NewOracleRepeatableTask instantiates a new OracleRepeatableTask object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRepeatableTaskWithDefaults

`func NewOracleRepeatableTaskWithDefaults() *OracleRepeatableTask`

NewOracleRepeatableTaskWithDefaults instantiates a new OracleRepeatableTask object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleRepeatableTask) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleRepeatableTask) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleRepeatableTask) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleRepeatableTask) GetType() Enum`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleRepeatableTask) GetTypeOk() (*Enum, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleRepeatableTask) SetType(v Enum)`

SetType sets Type field to given value.

### HasType

`func (o *OracleRepeatableTask) HasType() bool`

HasType returns a boolean if a field has been set.

### GetSrcNetworkId

`func (o *OracleRepeatableTask) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *OracleRepeatableTask) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *OracleRepeatableTask) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *OracleRepeatableTask) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *OracleRepeatableTask) GetSrcContract() OracleRegisterRequest200ResponseSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *OracleRepeatableTask) GetSrcContractOk() (*OracleRegisterRequest200ResponseSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *OracleRepeatableTask) SetSrcContract(v OracleRegisterRequest200ResponseSrcContract)`

SetSrcContract sets SrcContract field to given value.

### HasSrcContract

`func (o *OracleRepeatableTask) HasSrcContract() bool`

HasSrcContract returns a boolean if a field has been set.

### GetDstNetworkId

`func (o *OracleRepeatableTask) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *OracleRepeatableTask) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *OracleRepeatableTask) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *OracleRepeatableTask) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *OracleRepeatableTask) GetDstContract() OracleRegisterRequest200ResponseDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *OracleRepeatableTask) GetDstContractOk() (*OracleRegisterRequest200ResponseDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *OracleRepeatableTask) SetDstContract(v OracleRegisterRequest200ResponseDstContract)`

SetDstContract sets DstContract field to given value.

### HasDstContract

`func (o *OracleRepeatableTask) HasDstContract() bool`

HasDstContract returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleRepeatableTask) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleRepeatableTask) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleRepeatableTask) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.

### HasTimestamp

`func (o *OracleRepeatableTask) HasTimestamp() bool`

HasTimestamp returns a boolean if a field has been set.

### GetOperations

`func (o *OracleRepeatableTask) GetOperations() []OracleRegisterRequest200ResponseOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *OracleRepeatableTask) GetOperationsOk() (*[]OracleRegisterRequest200ResponseOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *OracleRepeatableTask) SetOperations(v []OracleRegisterRequest200ResponseOperationsInner)`

SetOperations sets Operations field to given value.

### HasOperations

`func (o *OracleRepeatableTask) HasOperations() bool`

HasOperations returns a boolean if a field has been set.

### GetStatus

`func (o *OracleRepeatableTask) GetStatus() Enum`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleRepeatableTask) GetStatusOk() (*Enum, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleRepeatableTask) SetStatus(v Enum)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *OracleRepeatableTask) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetMode

`func (o *OracleRepeatableTask) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *OracleRepeatableTask) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *OracleRepeatableTask) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *OracleRepeatableTask) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *OracleRepeatableTask) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *OracleRepeatableTask) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *OracleRepeatableTask) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.

### GetSourceEventSignature

`func (o *OracleRepeatableTask) GetSourceEventSignature() string`

GetSourceEventSignature returns the SourceEventSignature field if non-nil, zero value otherwise.

### GetSourceEventSignatureOk

`func (o *OracleRepeatableTask) GetSourceEventSignatureOk() (*string, bool)`

GetSourceEventSignatureOk returns a tuple with the SourceEventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceEventSignature

`func (o *OracleRepeatableTask) SetSourceEventSignature(v string)`

SetSourceEventSignature sets SourceEventSignature field to given value.

### HasSourceEventSignature

`func (o *OracleRepeatableTask) HasSourceEventSignature() bool`

HasSourceEventSignature returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


