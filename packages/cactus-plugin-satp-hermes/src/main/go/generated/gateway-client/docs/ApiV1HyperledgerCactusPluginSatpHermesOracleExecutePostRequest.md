# ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DestinationNetworkId** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**SourceContract** | Pointer to [**ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestSourceContract**](ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestSourceContract.md) |  | [optional] 
**DestinationContract** | Pointer to [**ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestDestinationContract**](ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestDestinationContract.md) |  | [optional] 
**TaskType** | Pointer to **string** | The type of task to be registered. | [optional] 

## Methods

### NewApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest() *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest`

NewApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestWithDefaults

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestWithDefaults() *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest`

NewApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestWithDefaults instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetSourceNetworkId() TransactRequestSourceAssetNetworkId`

GetSourceNetworkId returns the SourceNetworkId field if non-nil, zero value otherwise.

### GetSourceNetworkIdOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetSourceNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSourceNetworkIdOk returns a tuple with the SourceNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) SetSourceNetworkId(v TransactRequestSourceAssetNetworkId)`

SetSourceNetworkId sets SourceNetworkId field to given value.

### HasSourceNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) HasSourceNetworkId() bool`

HasSourceNetworkId returns a boolean if a field has been set.

### GetDestinationNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetDestinationNetworkId() TransactRequestSourceAssetNetworkId`

GetDestinationNetworkId returns the DestinationNetworkId field if non-nil, zero value otherwise.

### GetDestinationNetworkIdOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetDestinationNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDestinationNetworkIdOk returns a tuple with the DestinationNetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) SetDestinationNetworkId(v TransactRequestSourceAssetNetworkId)`

SetDestinationNetworkId sets DestinationNetworkId field to given value.

### HasDestinationNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) HasDestinationNetworkId() bool`

HasDestinationNetworkId returns a boolean if a field has been set.

### GetSourceContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetSourceContract() ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestSourceContract`

GetSourceContract returns the SourceContract field if non-nil, zero value otherwise.

### GetSourceContractOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetSourceContractOk() (*ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestSourceContract, bool)`

GetSourceContractOk returns a tuple with the SourceContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) SetSourceContract(v ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestSourceContract)`

SetSourceContract sets SourceContract field to given value.

### HasSourceContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) HasSourceContract() bool`

HasSourceContract returns a boolean if a field has been set.

### GetDestinationContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetDestinationContract() ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestDestinationContract`

GetDestinationContract returns the DestinationContract field if non-nil, zero value otherwise.

### GetDestinationContractOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetDestinationContractOk() (*ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestDestinationContract, bool)`

GetDestinationContractOk returns a tuple with the DestinationContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) SetDestinationContract(v ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequestDestinationContract)`

SetDestinationContract sets DestinationContract field to given value.

### HasDestinationContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) HasDestinationContract() bool`

HasDestinationContract returns a boolean if a field has been set.

### GetTaskType

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetTaskType() string`

GetTaskType returns the TaskType field if non-nil, zero value otherwise.

### GetTaskTypeOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) GetTaskTypeOk() (*string, bool)`

GetTaskTypeOk returns a tuple with the TaskType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskType

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) SetTaskType(v string)`

SetTaskType sets TaskType field to given value.

### HasTaskType

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleExecutePostRequest) HasTaskType() bool`

HasTaskType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


