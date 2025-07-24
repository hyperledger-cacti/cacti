# OracleExecuteRequestRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DestinationNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SourceContract** | Pointer to [**OracleExecuteRequestRequestSourceContract**](OracleExecuteRequestRequestSourceContract.md) |  | [optional] 
**DestinationContract** | Pointer to [**OracleExecuteRequestRequestDestinationContract**](OracleExecuteRequestRequestDestinationContract.md) |  | [optional] 
**TaskType** | Pointer to **string** | The type of task to be registered. | [optional] 

## Methods

### NewOracleExecuteRequestRequest

`func NewOracleExecuteRequestRequest() *OracleExecuteRequestRequest`

NewOracleExecuteRequestRequest instantiates a new OracleExecuteRequestRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleExecuteRequestRequestWithDefaults

`func NewOracleExecuteRequestRequestWithDefaults() *OracleExecuteRequestRequest`

NewOracleExecuteRequestRequestWithDefaults instantiates a new OracleExecuteRequestRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceNetworkId

`func (o *OracleExecuteRequestRequest) GetSourceNetworkId() TransactRequestSourceAssetNetworkId`

GetSourceNetworkId returns the SourceNetworkId field if non-nil, zero value otherwise.

### GetSourceNetworkIdOk

`func (o *OracleExecuteRequestRequest) GetSourceNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSourceNetworkIdOk returns a tuple with the SourceNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceNetworkId

`func (o *OracleExecuteRequestRequest) SetSourceNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSourceNetworkId sets SourceNetworkId field to given value.

### HasSourceNetworkId

`func (o *OracleExecuteRequestRequest) HasSourceNetworkId() bool`

HasSourceNetworkId returns a boolean if a field has been set.

### GetDestinationNetworkId

`func (o *OracleExecuteRequestRequest) GetDestinationNetworkId() TransactRequestSourceAssetNetworkId`

GetDestinationNetworkId returns the DestinationNetworkId field if non-nil, zero value otherwise.

### GetDestinationNetworkIdOk

`func (o *OracleExecuteRequestRequest) GetDestinationNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDestinationNetworkIdOk returns a tuple with the DestinationNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationNetworkId

`func (o *OracleExecuteRequestRequest) SetDestinationNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDestinationNetworkId sets DestinationNetworkId field to given value.

### HasDestinationNetworkId

`func (o *OracleExecuteRequestRequest) HasDestinationNetworkId() bool`

HasDestinationNetworkId returns a boolean if a field has been set.

### GetSourceContract

`func (o *OracleExecuteRequestRequest) GetSourceContract() OracleExecuteRequestRequestSourceContract`

GetSourceContract returns the SourceContract field if non-nil, zero value otherwise.

### GetSourceContractOk

`func (o *OracleExecuteRequestRequest) GetSourceContractOk() (*OracleExecuteRequestRequestSourceContract, bool)`

GetSourceContractOk returns a tuple with the SourceContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceContract

`func (o *OracleExecuteRequestRequest) SetSourceContract(v OracleExecuteRequestRequestSourceContract)`

SetSourceContract sets SourceContract field to given value.

### HasSourceContract

`func (o *OracleExecuteRequestRequest) HasSourceContract() bool`

HasSourceContract returns a boolean if a field has been set.

### GetDestinationContract

`func (o *OracleExecuteRequestRequest) GetDestinationContract() OracleExecuteRequestRequestDestinationContract`

GetDestinationContract returns the DestinationContract field if non-nil, zero value otherwise.

### GetDestinationContractOk

`func (o *OracleExecuteRequestRequest) GetDestinationContractOk() (*OracleExecuteRequestRequestDestinationContract, bool)`

GetDestinationContractOk returns a tuple with the DestinationContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationContract

`func (o *OracleExecuteRequestRequest) SetDestinationContract(v OracleExecuteRequestRequestDestinationContract)`

SetDestinationContract sets DestinationContract field to given value.

### HasDestinationContract

`func (o *OracleExecuteRequestRequest) HasDestinationContract() bool`

HasDestinationContract returns a boolean if a field has been set.

### GetTaskType

`func (o *OracleExecuteRequestRequest) GetTaskType() string`

GetTaskType returns the TaskType field if non-nil, zero value otherwise.

### GetTaskTypeOk

`func (o *OracleExecuteRequestRequest) GetTaskTypeOk() (*string, bool)`

GetTaskTypeOk returns a tuple with the TaskType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskType

`func (o *OracleExecuteRequestRequest) SetTaskType(v string)`

SetTaskType sets TaskType field to given value.

### HasTaskType

`func (o *OracleExecuteRequestRequest) HasTaskType() bool`

HasTaskType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


