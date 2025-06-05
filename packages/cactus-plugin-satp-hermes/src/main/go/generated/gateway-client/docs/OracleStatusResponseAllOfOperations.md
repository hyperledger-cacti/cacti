# OracleStatusResponseAllOfOperations

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**OracleStatusResponseAllOfSrcNetworkId**](OracleStatusResponseAllOfSrcNetworkId.md) |  | 
**Contract** | [**OracleStatusResponseAllOfContract**](OracleStatusResponseAllOfContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**OracleStatusResponseAllOfOutput**](OracleStatusResponseAllOfOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewOracleStatusResponseAllOfOperations

`func NewOracleStatusResponseAllOfOperations(id string, type_ string, networkId OracleStatusResponseAllOfSrcNetworkId, contract OracleStatusResponseAllOfContract, status string, timestamp int64, ) *OracleStatusResponseAllOfOperations`

NewOracleStatusResponseAllOfOperations instantiates a new OracleStatusResponseAllOfOperations object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleStatusResponseAllOfOperationsWithDefaults

`func NewOracleStatusResponseAllOfOperationsWithDefaults() *OracleStatusResponseAllOfOperations`

NewOracleStatusResponseAllOfOperationsWithDefaults instantiates a new OracleStatusResponseAllOfOperations object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleStatusResponseAllOfOperations) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleStatusResponseAllOfOperations) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleStatusResponseAllOfOperations) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleStatusResponseAllOfOperations) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleStatusResponseAllOfOperations) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleStatusResponseAllOfOperations) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *OracleStatusResponseAllOfOperations) GetNetworkId() OracleStatusResponseAllOfSrcNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *OracleStatusResponseAllOfOperations) GetNetworkIdOk() (*OracleStatusResponseAllOfSrcNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *OracleStatusResponseAllOfOperations) SetNetworkId(v OracleStatusResponseAllOfSrcNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *OracleStatusResponseAllOfOperations) GetContract() OracleStatusResponseAllOfContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *OracleStatusResponseAllOfOperations) GetContractOk() (*OracleStatusResponseAllOfContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *OracleStatusResponseAllOfOperations) SetContract(v OracleStatusResponseAllOfContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *OracleStatusResponseAllOfOperations) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleStatusResponseAllOfOperations) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleStatusResponseAllOfOperations) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *OracleStatusResponseAllOfOperations) GetOutput() OracleStatusResponseAllOfOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleStatusResponseAllOfOperations) GetOutputOk() (*OracleStatusResponseAllOfOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleStatusResponseAllOfOperations) SetOutput(v OracleStatusResponseAllOfOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleStatusResponseAllOfOperations) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleStatusResponseAllOfOperations) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleStatusResponseAllOfOperations) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleStatusResponseAllOfOperations) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


