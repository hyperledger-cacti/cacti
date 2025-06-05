# GetAudit200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Proofs** | Pointer to **[]string** | An array of strings representing proofs. | [optional] 
**AuditStartTime** | Pointer to **time.Time** | The start datetime of the audit period. | [optional] 
**AuditEndTime** | Pointer to **time.Time** | The end datetime of the audit period. | [optional] 

## Methods

### NewGetAudit200Response

`func NewGetAudit200Response() *GetAudit200Response`

NewGetAudit200Response instantiates a new GetAudit200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetAudit200ResponseWithDefaults

`func NewGetAudit200ResponseWithDefaults() *GetAudit200Response`

NewGetAudit200ResponseWithDefaults instantiates a new GetAudit200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProofs

`func (o *GetAudit200Response) GetProofs() []string`

GetProofs returns the Proofs field if non-nil, zero value otherwise.

### GetProofsOk

`func (o *GetAudit200Response) GetProofsOk() (*[]string, bool)`

GetProofsOk returns a tuple with the Proofs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProofs

`func (o *GetAudit200Response) SetProofs(v []string)`

SetProofs sets Proofs field to given value.

### HasProofs

`func (o *GetAudit200Response) HasProofs() bool`

HasProofs returns a boolean if a field has been set.

### GetAuditStartTime

`func (o *GetAudit200Response) GetAuditStartTime() time.Time`

GetAuditStartTime returns the AuditStartTime field if non-nil, zero value otherwise.

### GetAuditStartTimeOk

`func (o *GetAudit200Response) GetAuditStartTimeOk() (*time.Time, bool)`

GetAuditStartTimeOk returns a tuple with the AuditStartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditStartTime

`func (o *GetAudit200Response) SetAuditStartTime(v time.Time)`

SetAuditStartTime sets AuditStartTime field to given value.

### HasAuditStartTime

`func (o *GetAudit200Response) HasAuditStartTime() bool`

HasAuditStartTime returns a boolean if a field has been set.

### GetAuditEndTime

`func (o *GetAudit200Response) GetAuditEndTime() time.Time`

GetAuditEndTime returns the AuditEndTime field if non-nil, zero value otherwise.

### GetAuditEndTimeOk

`func (o *GetAudit200Response) GetAuditEndTimeOk() (*time.Time, bool)`

GetAuditEndTimeOk returns a tuple with the AuditEndTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditEndTime

`func (o *GetAudit200Response) SetAuditEndTime(v time.Time)`

SetAuditEndTime sets AuditEndTime field to given value.

### HasAuditEndTime

`func (o *GetAudit200Response) HasAuditEndTime() bool`

HasAuditEndTime returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


