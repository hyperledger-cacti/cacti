# OracleStatusRequest200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskID** | Pointer to **string** | The unique identifier for the context of the data transfer task. | [optional] 
**SourceNetwork** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**DestinationNetwork** | Pointer to [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] 
**OriginContract** | Pointer to [**OracleStatusRequest200ResponseOriginContract**](OracleStatusRequest200ResponseOriginContract.md) |  | [optional] 
**DestinationContract** | Pointer to [**OracleStatusRequest200ResponseDestinationContract**](OracleStatusRequest200ResponseDestinationContract.md) |  | [optional] 
**EventOfInterest** | Pointer to [**OracleStatusRequest200ResponseEventOfInterest**](OracleStatusRequest200ResponseEventOfInterest.md) |  | [optional] 
**WriteFunction** | Pointer to [**OracleStatusRequest200ResponseWriteFunction**](OracleStatusRequest200ResponseWriteFunction.md) |  | [optional] 
**Tasks** | Pointer to [**[]OracleStatusRequest200ResponseTasksInner**](OracleStatusRequest200ResponseTasksInner.md) |  | [optional] 
**Status** | Pointer to **string** | The status of the data transfer task. | [optional] 

## Methods

### NewOracleStatusRequest200Response

`func NewOracleStatusRequest200Response() *OracleStatusRequest200Response`

NewOracleStatusRequest200Response instantiates a new OracleStatusRequest200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleStatusRequest200ResponseWithDefaults

`func NewOracleStatusRequest200ResponseWithDefaults() *OracleStatusRequest200Response`

NewOracleStatusRequest200ResponseWithDefaults instantiates a new OracleStatusRequest200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskID

`func (o *OracleStatusRequest200Response) GetTaskID() string`

GetTaskID returns the TaskID field if non-nil, zero value otherwise.

### GetTaskIDOk

`func (o *OracleStatusRequest200Response) GetTaskIDOk() (*string, bool)`

GetTaskIDOk returns a tuple with the TaskID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskID

`func (o *OracleStatusRequest200Response) SetTaskID(v string)`

SetTaskID sets TaskID field to given value.

### HasTaskID

`func (o *OracleStatusRequest200Response) HasTaskID() bool`

HasTaskID returns a boolean if a field has been set.

### GetSourceNetwork

`func (o *OracleStatusRequest200Response) GetSourceNetwork() TransactRequestSourceAssetNetworkId`

GetSourceNetwork returns the SourceNetwork field if non-nil, zero value otherwise.

### GetSourceNetworkOk

`func (o *OracleStatusRequest200Response) GetSourceNetworkOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetSourceNetworkOk returns a tuple with the SourceNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceNetwork

`func (o *OracleStatusRequest200Response) SetSourceNetwork(v TransactRequestSourceAssetNetworkId)`

SetSourceNetwork sets SourceNetwork field to given value.

### HasSourceNetwork

`func (o *OracleStatusRequest200Response) HasSourceNetwork() bool`

HasSourceNetwork returns a boolean if a field has been set.

### GetDestinationNetwork

`func (o *OracleStatusRequest200Response) GetDestinationNetwork() TransactRequestSourceAssetNetworkId`

GetDestinationNetwork returns the DestinationNetwork field if non-nil, zero value otherwise.

### GetDestinationNetworkOk

`func (o *OracleStatusRequest200Response) GetDestinationNetworkOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetDestinationNetworkOk returns a tuple with the DestinationNetwork field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationNetwork

`func (o *OracleStatusRequest200Response) SetDestinationNetwork(v TransactRequestSourceAssetNetworkId)`

SetDestinationNetwork sets DestinationNetwork field to given value.

### HasDestinationNetwork

`func (o *OracleStatusRequest200Response) HasDestinationNetwork() bool`

HasDestinationNetwork returns a boolean if a field has been set.

### GetOriginContract

`func (o *OracleStatusRequest200Response) GetOriginContract() OracleStatusRequest200ResponseOriginContract`

GetOriginContract returns the OriginContract field if non-nil, zero value otherwise.

### GetOriginContractOk

`func (o *OracleStatusRequest200Response) GetOriginContractOk() (*OracleStatusRequest200ResponseOriginContract, bool)`

GetOriginContractOk returns a tuple with the OriginContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginContract

`func (o *OracleStatusRequest200Response) SetOriginContract(v OracleStatusRequest200ResponseOriginContract)`

SetOriginContract sets OriginContract field to given value.

### HasOriginContract

`func (o *OracleStatusRequest200Response) HasOriginContract() bool`

HasOriginContract returns a boolean if a field has been set.

### GetDestinationContract

`func (o *OracleStatusRequest200Response) GetDestinationContract() OracleStatusRequest200ResponseDestinationContract`

GetDestinationContract returns the DestinationContract field if non-nil, zero value otherwise.

### GetDestinationContractOk

`func (o *OracleStatusRequest200Response) GetDestinationContractOk() (*OracleStatusRequest200ResponseDestinationContract, bool)`

GetDestinationContractOk returns a tuple with the DestinationContract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDestinationContract

`func (o *OracleStatusRequest200Response) SetDestinationContract(v OracleStatusRequest200ResponseDestinationContract)`

SetDestinationContract sets DestinationContract field to given value.

### HasDestinationContract

`func (o *OracleStatusRequest200Response) HasDestinationContract() bool`

HasDestinationContract returns a boolean if a field has been set.

### GetEventOfInterest

`func (o *OracleStatusRequest200Response) GetEventOfInterest() OracleStatusRequest200ResponseEventOfInterest`

GetEventOfInterest returns the EventOfInterest field if non-nil, zero value otherwise.

### GetEventOfInterestOk

`func (o *OracleStatusRequest200Response) GetEventOfInterestOk() (*OracleStatusRequest200ResponseEventOfInterest, bool)`

GetEventOfInterestOk returns a tuple with the EventOfInterest field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventOfInterest

`func (o *OracleStatusRequest200Response) SetEventOfInterest(v OracleStatusRequest200ResponseEventOfInterest)`

SetEventOfInterest sets EventOfInterest field to given value.

### HasEventOfInterest

`func (o *OracleStatusRequest200Response) HasEventOfInterest() bool`

HasEventOfInterest returns a boolean if a field has been set.

### GetWriteFunction

`func (o *OracleStatusRequest200Response) GetWriteFunction() OracleStatusRequest200ResponseWriteFunction`

GetWriteFunction returns the WriteFunction field if non-nil, zero value otherwise.

### GetWriteFunctionOk

`func (o *OracleStatusRequest200Response) GetWriteFunctionOk() (*OracleStatusRequest200ResponseWriteFunction, bool)`

GetWriteFunctionOk returns a tuple with the WriteFunction field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWriteFunction

`func (o *OracleStatusRequest200Response) SetWriteFunction(v OracleStatusRequest200ResponseWriteFunction)`

SetWriteFunction sets WriteFunction field to given value.

### HasWriteFunction

`func (o *OracleStatusRequest200Response) HasWriteFunction() bool`

HasWriteFunction returns a boolean if a field has been set.

### GetTasks

`func (o *OracleStatusRequest200Response) GetTasks() []OracleStatusRequest200ResponseTasksInner`

GetTasks returns the Tasks field if non-nil, zero value otherwise.

### GetTasksOk

`func (o *OracleStatusRequest200Response) GetTasksOk() (*[]OracleStatusRequest200ResponseTasksInner, bool)`

GetTasksOk returns a tuple with the Tasks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTasks

`func (o *OracleStatusRequest200Response) SetTasks(v []OracleStatusRequest200ResponseTasksInner)`

SetTasks sets Tasks field to given value.

### HasTasks

`func (o *OracleStatusRequest200Response) HasTasks() bool`

HasTasks returns a boolean if a field has been set.

### GetStatus

`func (o *OracleStatusRequest200Response) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleStatusRequest200Response) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleStatusRequest200Response) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *OracleStatusRequest200Response) HasStatus() bool`

HasStatus returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


