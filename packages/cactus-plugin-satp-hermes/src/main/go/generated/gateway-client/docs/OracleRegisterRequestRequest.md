# OracleRegisterRequestRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle task. | 
**Type** | [**Enum**](enum.md) | The type of the Oracle task. | 
**SrcNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SrcContract** | [**OracleRegisterRequestRequestSrcContract**](OracleRegisterRequestRequestSrcContract.md) |  | 
**DstNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DstContract** | [**OracleRegisterRequestRequestDstContract**](OracleRegisterRequestRequestDstContract.md) |  | 
**Timestamp** | **int64** | The timestamp when the Oracle task was created or last updated. | 
**Operations** | [**[]OracleRegisterRequestRequestOperationsInner**](OracleRegisterRequestRequestOperationsInner.md) | The list of operations performed by the Oracle task. | 
**Status** | [**Enum**](enum.md) | The current status of the Oracle task. | 
**Mode** | **string** | The mode of operation for registered tasks. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 

## Methods

### NewOracleRegisterRequestRequest

`func NewOracleRegisterRequestRequest(id string, type_ Enum, srcContract OracleRegisterRequestRequestSrcContract, dstContract OracleRegisterRequestRequestDstContract, timestamp int64, operations []OracleRegisterRequestRequestOperationsInner, status Enum, mode string, ) *OracleRegisterRequestRequest`

NewOracleRegisterRequestRequest instantiates a new OracleRegisterRequestRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequestRequestWithDefaults

`func NewOracleRegisterRequestRequestWithDefaults() *OracleRegisterRequestRequest`

NewOracleRegisterRequestRequestWithDefaults instantiates a new OracleRegisterRequestRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleRegisterRequestRequest) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleRegisterRequestRequest) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleRegisterRequestRequest) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleRegisterRequestRequest) GetType() Enum`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleRegisterRequestRequest) GetTypeOk() (*Enum, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleRegisterRequestRequest) SetType(v Enum)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *OracleRegisterRequestRequest) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *OracleRegisterRequestRequest) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *OracleRegisterRequestRequest) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *OracleRegisterRequestRequest) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *OracleRegisterRequestRequest) GetSrcContract() OracleRegisterRequestRequestSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *OracleRegisterRequestRequest) GetSrcContractOk() (*OracleRegisterRequestRequestSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *OracleRegisterRequestRequest) SetSrcContract(v OracleRegisterRequestRequestSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *OracleRegisterRequestRequest) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *OracleRegisterRequestRequest) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *OracleRegisterRequestRequest) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *OracleRegisterRequestRequest) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *OracleRegisterRequestRequest) GetDstContract() OracleRegisterRequestRequestDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *OracleRegisterRequestRequest) GetDstContractOk() (*OracleRegisterRequestRequestDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *OracleRegisterRequestRequest) SetDstContract(v OracleRegisterRequestRequestDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *OracleRegisterRequestRequest) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleRegisterRequestRequest) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleRegisterRequestRequest) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *OracleRegisterRequestRequest) GetOperations() []OracleRegisterRequestRequestOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *OracleRegisterRequestRequest) GetOperationsOk() (*[]OracleRegisterRequestRequestOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *OracleRegisterRequestRequest) SetOperations(v []OracleRegisterRequestRequestOperationsInner)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *OracleRegisterRequestRequest) GetStatus() Enum`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleRegisterRequestRequest) GetStatusOk() (*Enum, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleRegisterRequestRequest) SetStatus(v Enum)`

SetStatus sets Status field to given value.


### GetMode

`func (o *OracleRegisterRequestRequest) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *OracleRegisterRequestRequest) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *OracleRegisterRequestRequest) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *OracleRegisterRequestRequest) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *OracleRegisterRequestRequest) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *OracleRegisterRequestRequest) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *OracleRegisterRequestRequest) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


