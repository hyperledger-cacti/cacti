# GetAuditResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Proofs** | Pointer to **[]string** | An array of strings representing proofs. | [optional] 
**AuditStartTime** | Pointer to **time.Time** | The start datetime of the audit period. | [optional] 
**AuditEndTime** | Pointer to **time.Time** | The end datetime of the audit period. | [optional] 

## Methods

### NewGetAuditResponse

`func NewGetAuditResponse() *GetAuditResponse`

NewGetAuditResponse instantiates a new GetAuditResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetAuditResponseWithDefaults

`func NewGetAuditResponseWithDefaults() *GetAuditResponse`

NewGetAuditResponseWithDefaults instantiates a new GetAuditResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProofs

`func (o *GetAuditResponse) GetProofs() []string`

GetProofs returns the Proofs field if non-nil, zero value otherwise.

### GetProofsOk

`func (o *GetAuditResponse) GetProofsOk() (*[]string, bool)`

GetProofsOk returns a tuple with the Proofs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProofs

`func (o *GetAuditResponse) SetProofs(v []string)`

SetProofs sets Proofs field to given value.

### HasProofs

`func (o *GetAuditResponse) HasProofs() bool`

HasProofs returns a boolean if a field has been set.

### GetAuditStartTime

`func (o *GetAuditResponse) GetAuditStartTime() time.Time`

GetAuditStartTime returns the AuditStartTime field if non-nil, zero value otherwise.

### GetAuditStartTimeOk

`func (o *GetAuditResponse) GetAuditStartTimeOk() (*time.Time, bool)`

GetAuditStartTimeOk returns a tuple with the AuditStartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditStartTime

`func (o *GetAuditResponse) SetAuditStartTime(v time.Time)`

SetAuditStartTime sets AuditStartTime field to given value.

### HasAuditStartTime

`func (o *GetAuditResponse) HasAuditStartTime() bool`

HasAuditStartTime returns a boolean if a field has been set.

### GetAuditEndTime

`func (o *GetAuditResponse) GetAuditEndTime() time.Time`

GetAuditEndTime returns the AuditEndTime field if non-nil, zero value otherwise.

### GetAuditEndTimeOk

`func (o *GetAuditResponse) GetAuditEndTimeOk() (*time.Time, bool)`

GetAuditEndTimeOk returns a tuple with the AuditEndTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditEndTime

`func (o *GetAuditResponse) SetAuditEndTime(v time.Time)`

SetAuditEndTime sets AuditEndTime field to given value.

### HasAuditEndTime

`func (o *GetAuditResponse) HasAuditEndTime() bool`

HasAuditEndTime returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


