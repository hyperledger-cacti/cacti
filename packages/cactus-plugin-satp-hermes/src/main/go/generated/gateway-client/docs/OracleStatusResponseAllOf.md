# OracleStatusResponseAllOf

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle task. | 
**Type** | [**Enum**](enum.md) | The type of the Oracle task. | 
**SrcNetworkId** | Pointer to [**OracleStatusResponseAllOfSrcNetworkId**](OracleStatusResponseAllOfSrcNetworkId.md) |  | [optional] 
**SrcContract** | [**OracleStatusResponseAllOfSrcContract**](OracleStatusResponseAllOfSrcContract.md) |  | 
**DstNetworkId** | Pointer to [**OracleStatusResponseAllOfSrcNetworkId**](OracleStatusResponseAllOfSrcNetworkId.md) |  | [optional] 
**DstContract** | [**OracleStatusResponseAllOfDstContract**](OracleStatusResponseAllOfDstContract.md) |  | 
**Timestamp** | **int64** | The timestamp when the Oracle task was created or last updated. | 
**Operations** | [**[]OracleStatusResponseAllOfOperations**](OracleStatusResponseAllOfOperations.md) | The list of operations performed by the Oracle task. | 
**Status** | [**Enum**](enum.md) | The current status of the Oracle task. | 
**Mode** | **string** | The mode of operation for registered tasks. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 

## Methods

### NewOracleStatusResponseAllOf

`func NewOracleStatusResponseAllOf(id string, type_ Enum, srcContract OracleStatusResponseAllOfSrcContract, dstContract OracleStatusResponseAllOfDstContract, timestamp int64, operations []OracleStatusResponseAllOfOperations, status Enum, mode string, ) *OracleStatusResponseAllOf`

NewOracleStatusResponseAllOf instantiates a new OracleStatusResponseAllOf object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleStatusResponseAllOfWithDefaults

`func NewOracleStatusResponseAllOfWithDefaults() *OracleStatusResponseAllOf`

NewOracleStatusResponseAllOfWithDefaults instantiates a new OracleStatusResponseAllOf object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleStatusResponseAllOf) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleStatusResponseAllOf) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleStatusResponseAllOf) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleStatusResponseAllOf) GetType() Enum`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleStatusResponseAllOf) GetTypeOk() (*Enum, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleStatusResponseAllOf) SetType(v Enum)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *OracleStatusResponseAllOf) GetSrcNetworkId() OracleStatusResponseAllOfSrcNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *OracleStatusResponseAllOf) GetSrcNetworkIdOk() (*OracleStatusResponseAllOfSrcNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *OracleStatusResponseAllOf) SetSrcNetworkId(v OracleStatusResponseAllOfSrcNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *OracleStatusResponseAllOf) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *OracleStatusResponseAllOf) GetSrcContract() OracleStatusResponseAllOfSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *OracleStatusResponseAllOf) GetSrcContractOk() (*OracleStatusResponseAllOfSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *OracleStatusResponseAllOf) SetSrcContract(v OracleStatusResponseAllOfSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *OracleStatusResponseAllOf) GetDstNetworkId() OracleStatusResponseAllOfSrcNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *OracleStatusResponseAllOf) GetDstNetworkIdOk() (*OracleStatusResponseAllOfSrcNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *OracleStatusResponseAllOf) SetDstNetworkId(v OracleStatusResponseAllOfSrcNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *OracleStatusResponseAllOf) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *OracleStatusResponseAllOf) GetDstContract() OracleStatusResponseAllOfDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *OracleStatusResponseAllOf) GetDstContractOk() (*OracleStatusResponseAllOfDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *OracleStatusResponseAllOf) SetDstContract(v OracleStatusResponseAllOfDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *OracleStatusResponseAllOf) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleStatusResponseAllOf) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleStatusResponseAllOf) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *OracleStatusResponseAllOf) GetOperations() []OracleStatusResponseAllOfOperations`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *OracleStatusResponseAllOf) GetOperationsOk() (*[]OracleStatusResponseAllOfOperations, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *OracleStatusResponseAllOf) SetOperations(v []OracleStatusResponseAllOfOperations)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *OracleStatusResponseAllOf) GetStatus() Enum`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleStatusResponseAllOf) GetStatusOk() (*Enum, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleStatusResponseAllOf) SetStatus(v Enum)`

SetStatus sets Status field to given value.


### GetMode

`func (o *OracleStatusResponseAllOf) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *OracleStatusResponseAllOf) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *OracleStatusResponseAllOf) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *OracleStatusResponseAllOf) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *OracleStatusResponseAllOf) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *OracleStatusResponseAllOf) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *OracleStatusResponseAllOf) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


