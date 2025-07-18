# ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle task. | 
**Type** | [**Enum**](enum.md) | The type of the Oracle task. | 
**SrcNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SrcContract** | [**ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContract**](ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContract.md) |  | 
**DstNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DstContract** | [**ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract**](ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract.md) |  | 
**Timestamp** | **int64** | The timestamp when the Oracle task was created or last updated. | 
**Operations** | [**[]ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner**](ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner.md) | The list of operations performed by the Oracle task. | 
**Status** | [**Enum**](enum.md) | The current status of the Oracle task. | 
**Mode** | **string** | The mode of operation for registered tasks. | 
**PollingInterval** | Pointer to **int32** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] 

## Methods

### NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest(id string, type_ Enum, srcContract ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContract, dstContract ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract, timestamp int64, operations []ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner, status Enum, mode string, ) *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest`

NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestWithDefaults

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestWithDefaults() *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest`

NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestWithDefaults instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetType() Enum`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetTypeOk() (*Enum, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetType(v Enum)`

SetType sets Type field to given value.


### GetSrcNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetSrcContract() ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetSrcContractOk() (*ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetSrcContract(v ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContract)`

SetSrcContract sets SrcContract field to given value.


### GetDstNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetDstContract() ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetDstContractOk() (*ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetDstContract(v ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract)`

SetDstContract sets DstContract field to given value.


### GetTimestamp

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.


### GetOperations

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetOperations() []ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetOperationsOk() (*[]ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetOperations(v []ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner)`

SetOperations sets Operations field to given value.


### GetStatus

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetStatus() Enum`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetStatusOk() (*Enum, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetStatus(v Enum)`

SetStatus sets Status field to given value.


### GetMode

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetMode(v string)`

SetMode sets Mode field to given value.


### GetPollingInterval

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetPollingInterval() int32`

GetPollingInterval returns the PollingInterval field if non-nil, zero value otherwise.

### GetPollingIntervalOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) GetPollingIntervalOk() (*int32, bool)`

GetPollingIntervalOk returns a tuple with the PollingInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPollingInterval

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) SetPollingInterval(v int32)`

SetPollingInterval sets PollingInterval field to given value.

### HasPollingInterval

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequest) HasPollingInterval() bool`

HasPollingInterval returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


