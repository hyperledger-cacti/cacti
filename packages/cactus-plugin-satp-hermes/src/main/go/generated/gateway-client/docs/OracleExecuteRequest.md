# OracleExecuteRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DestinationNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SourceContract** | Pointer to [**ExecuteOracleTaskRequestSourceContract**](ExecuteOracleTaskRequestSourceContract.md) |  | [optional] 
**DestinationContract** | Pointer to [**ExecuteOracleTaskRequestDestinationContract**](ExecuteOracleTaskRequestDestinationContract.md) |  | [optional] 
**TaskType** | Pointer to **string** | The type of task to be registered. | [optional] 

## Methods

### NewOracleExecuteRequest

`func NewOracleExecuteRequest() *OracleExecuteRequest`

NewOracleExecuteRequest instantiates a new OracleExecuteRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleExecuteRequestWithDefaults

`func NewOracleExecuteRequestWithDefaults() *OracleExecuteRequest`

NewOracleExecuteRequestWithDefaults instantiates a new OracleExecuteRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceNetworkId

`func (o *OracleExecuteRequest) GetSourceNetworkId() TransactRequestSourceAssetNetworkId`

GetSourceNetworkId returns the SourceNetworkId field if non-nil, zero value otherwise.

### GetSourceNetworkIdOk

`func (o *OracleExecuteRequest) GetSourceNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSourceNetworkIdOk returns a tuple with the SourceNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceNetworkId

`func (o *OracleExecuteRequest) SetSourceNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSourceNetworkId sets SourceNetworkId field to given value.

### HasSourceNetworkId

`func (o *OracleExecuteRequest) HasSourceNetworkId() bool`

HasSourceNetworkId returns a boolean if a field has been set.

### GetDestinationNetworkId

`func (o *OracleExecuteRequest) GetDestinationNetworkId() TransactRequestSourceAssetNetworkId`

GetDestinationNetworkId returns the DestinationNetworkId field if non-nil, zero value otherwise.

### GetDestinationNetworkIdOk

`func (o *OracleExecuteRequest) GetDestinationNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDestinationNetworkIdOk returns a tuple with the DestinationNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationNetworkId

`func (o *OracleExecuteRequest) SetDestinationNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDestinationNetworkId sets DestinationNetworkId field to given value.

### HasDestinationNetworkId

`func (o *OracleExecuteRequest) HasDestinationNetworkId() bool`

HasDestinationNetworkId returns a boolean if a field has been set.

### GetSourceContract

`func (o *OracleExecuteRequest) GetSourceContract() ExecuteOracleTaskRequestSourceContract`

GetSourceContract returns the SourceContract field if non-nil, zero value otherwise.

### GetSourceContractOk

`func (o *OracleExecuteRequest) GetSourceContractOk() (*ExecuteOracleTaskRequestSourceContract, bool)`

GetSourceContractOk returns a tuple with the SourceContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceContract

`func (o *OracleExecuteRequest) SetSourceContract(v ExecuteOracleTaskRequestSourceContract)`

SetSourceContract sets SourceContract field to given value.

### HasSourceContract

`func (o *OracleExecuteRequest) HasSourceContract() bool`

HasSourceContract returns a boolean if a field has been set.

### GetDestinationContract

`func (o *OracleExecuteRequest) GetDestinationContract() ExecuteOracleTaskRequestDestinationContract`

GetDestinationContract returns the DestinationContract field if non-nil, zero value otherwise.

### GetDestinationContractOk

`func (o *OracleExecuteRequest) GetDestinationContractOk() (*ExecuteOracleTaskRequestDestinationContract, bool)`

GetDestinationContractOk returns a tuple with the DestinationContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationContract

`func (o *OracleExecuteRequest) SetDestinationContract(v ExecuteOracleTaskRequestDestinationContract)`

SetDestinationContract sets DestinationContract field to given value.

### HasDestinationContract

`func (o *OracleExecuteRequest) HasDestinationContract() bool`

HasDestinationContract returns a boolean if a field has been set.

### GetTaskType

`func (o *OracleExecuteRequest) GetTaskType() string`

GetTaskType returns the TaskType field if non-nil, zero value otherwise.

### GetTaskTypeOk

`func (o *OracleExecuteRequest) GetTaskTypeOk() (*string, bool)`

GetTaskTypeOk returns a tuple with the TaskType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskType

`func (o *OracleExecuteRequest) SetTaskType(v string)`

SetTaskType sets TaskType field to given value.

### HasTaskType

`func (o *OracleExecuteRequest) HasTaskType() bool`

HasTaskType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


