# OracleRegisterRequestRequestOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**OracleRegisterRequestRequestOperationsInnerContract**](OracleRegisterRequestRequestOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**OracleRegisterRequestRequestOperationsInnerOutput**](OracleRegisterRequestRequestOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewOracleRegisterRequestRequestOperationsInner

`func NewOracleRegisterRequestRequestOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract OracleRegisterRequestRequestOperationsInnerContract, status string, timestamp int64, ) *OracleRegisterRequestRequestOperationsInner`

NewOracleRegisterRequestRequestOperationsInner instantiates a new OracleRegisterRequestRequestOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequestRequestOperationsInnerWithDefaults

`func NewOracleRegisterRequestRequestOperationsInnerWithDefaults() *OracleRegisterRequestRequestOperationsInner`

NewOracleRegisterRequestRequestOperationsInnerWithDefaults instantiates a new OracleRegisterRequestRequestOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleRegisterRequestRequestOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleRegisterRequestRequestOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleRegisterRequestRequestOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleRegisterRequestRequestOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleRegisterRequestRequestOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleRegisterRequestRequestOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *OracleRegisterRequestRequestOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *OracleRegisterRequestRequestOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *OracleRegisterRequestRequestOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *OracleRegisterRequestRequestOperationsInner) GetContract() OracleRegisterRequestRequestOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *OracleRegisterRequestRequestOperationsInner) GetContractOk() (*OracleRegisterRequestRequestOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *OracleRegisterRequestRequestOperationsInner) SetContract(v OracleRegisterRequestRequestOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *OracleRegisterRequestRequestOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleRegisterRequestRequestOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleRegisterRequestRequestOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *OracleRegisterRequestRequestOperationsInner) GetOutput() OracleRegisterRequestRequestOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleRegisterRequestRequestOperationsInner) GetOutputOk() (*OracleRegisterRequestRequestOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleRegisterRequestRequestOperationsInner) SetOutput(v OracleRegisterRequestRequestOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleRegisterRequestRequestOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleRegisterRequestRequestOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleRegisterRequestRequestOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleRegisterRequestRequestOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


