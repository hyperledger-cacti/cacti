# OracleExecuteRequest200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** | The unique identifier for the task. | [optional] 
**Type** | Pointer to **string** | The type of the Oracle task. | [optional] 
**SrcNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SrcContract** | Pointer to [**OracleExecuteRequest200ResponseSrcContract**](OracleExecuteRequest200ResponseSrcContract.md) |  | [optional] 
**DstNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DstContract** | Pointer to [**OracleExecuteRequest200ResponseDstContract**](OracleExecuteRequest200ResponseDstContract.md) |  | [optional] 
**Timestamp** | Pointer to **int64** | The timestamp when the Oracle task was created or last updated. | [optional] 
**Operations** | Pointer to [**[]OracleExecuteRequest200ResponseOperationsInner**](OracleExecuteRequest200ResponseOperationsInner.md) | The list of operations performed by the Oracle task. | [optional] 
**Status** | Pointer to **string** | The current status of the Oracle task. | [optional] 

## Methods

### NewOracleExecuteRequest200Response

`func NewOracleExecuteRequest200Response() *OracleExecuteRequest200Response`

NewOracleExecuteRequest200Response instantiates a new OracleExecuteRequest200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleExecuteRequest200ResponseWithDefaults

`func NewOracleExecuteRequest200ResponseWithDefaults() *OracleExecuteRequest200Response`

NewOracleExecuteRequest200ResponseWithDefaults instantiates a new OracleExecuteRequest200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleExecuteRequest200Response) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleExecuteRequest200Response) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleExecuteRequest200Response) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *OracleExecuteRequest200Response) HasId() bool`

HasId returns a boolean if a field has been set.

### GetType

`func (o *OracleExecuteRequest200Response) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleExecuteRequest200Response) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleExecuteRequest200Response) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *OracleExecuteRequest200Response) HasType() bool`

HasType returns a boolean if a field has been set.

### GetSrcNetworkId

`func (o *OracleExecuteRequest200Response) GetSrcNetworkId() TransactRequestSourceAssetNetworkId`

GetSrcNetworkId returns the SrcNetworkId field if non-nil, zero value otherwise.

### GetSrcNetworkIdOk

`func (o *OracleExecuteRequest200Response) GetSrcNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSrcNetworkIdOk returns a tuple with the SrcNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcNetworkId

`func (o *OracleExecuteRequest200Response) SetSrcNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSrcNetworkId sets SrcNetworkId field to given value.

### HasSrcNetworkId

`func (o *OracleExecuteRequest200Response) HasSrcNetworkId() bool`

HasSrcNetworkId returns a boolean if a field has been set.

### GetSrcContract

`func (o *OracleExecuteRequest200Response) GetSrcContract() OracleExecuteRequest200ResponseSrcContract`

GetSrcContract returns the SrcContract field if non-nil, zero value otherwise.

### GetSrcContractOk

`func (o *OracleExecuteRequest200Response) GetSrcContractOk() (*OracleExecuteRequest200ResponseSrcContract, bool)`

GetSrcContractOk returns a tuple with the SrcContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSrcContract

`func (o *OracleExecuteRequest200Response) SetSrcContract(v OracleExecuteRequest200ResponseSrcContract)`

SetSrcContract sets SrcContract field to given value.

### HasSrcContract

`func (o *OracleExecuteRequest200Response) HasSrcContract() bool`

HasSrcContract returns a boolean if a field has been set.

### GetDstNetworkId

`func (o *OracleExecuteRequest200Response) GetDstNetworkId() TransactRequestSourceAssetNetworkId`

GetDstNetworkId returns the DstNetworkId field if non-nil, zero value otherwise.

### GetDstNetworkIdOk

`func (o *OracleExecuteRequest200Response) GetDstNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDstNetworkIdOk returns a tuple with the DstNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstNetworkId

`func (o *OracleExecuteRequest200Response) SetDstNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDstNetworkId sets DstNetworkId field to given value.

### HasDstNetworkId

`func (o *OracleExecuteRequest200Response) HasDstNetworkId() bool`

HasDstNetworkId returns a boolean if a field has been set.

### GetDstContract

`func (o *OracleExecuteRequest200Response) GetDstContract() OracleExecuteRequest200ResponseDstContract`

GetDstContract returns the DstContract field if non-nil, zero value otherwise.

### GetDstContractOk

`func (o *OracleExecuteRequest200Response) GetDstContractOk() (*OracleExecuteRequest200ResponseDstContract, bool)`

GetDstContractOk returns a tuple with the DstContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDstContract

`func (o *OracleExecuteRequest200Response) SetDstContract(v OracleExecuteRequest200ResponseDstContract)`

SetDstContract sets DstContract field to given value.

### HasDstContract

`func (o *OracleExecuteRequest200Response) HasDstContract() bool`

HasDstContract returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleExecuteRequest200Response) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleExecuteRequest200Response) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleExecuteRequest200Response) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.

### HasTimestamp

`func (o *OracleExecuteRequest200Response) HasTimestamp() bool`

HasTimestamp returns a boolean if a field has been set.

### GetOperations

`func (o *OracleExecuteRequest200Response) GetOperations() []OracleExecuteRequest200ResponseOperationsInner`

GetOperations returns the Operations field if non-nil, zero value otherwise.

### GetOperationsOk

`func (o *OracleExecuteRequest200Response) GetOperationsOk() (*[]OracleExecuteRequest200ResponseOperationsInner, bool)`

GetOperationsOk returns a tuple with the Operations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOperations

`func (o *OracleExecuteRequest200Response) SetOperations(v []OracleExecuteRequest200ResponseOperationsInner)`

SetOperations sets Operations field to given value.

### HasOperations

`func (o *OracleExecuteRequest200Response) HasOperations() bool`

HasOperations returns a boolean if a field has been set.

### GetStatus

`func (o *OracleExecuteRequest200Response) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleExecuteRequest200Response) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleExecuteRequest200Response) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *OracleExecuteRequest200Response) HasStatus() bool`

HasStatus returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


