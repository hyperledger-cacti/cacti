# GetAuditRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AuditStartDate** | Pointer to **time.Time** | The start datetime for the audit. | [optional] 
**AuditEndDate** | Pointer to **time.Time** | The end datetime for the audit. | [optional] 
**IncludeProofs** | Pointer to **bool** | Include proofs generated from each gateway transaction. | [optional] 

## Methods

### NewGetAuditRequest

`func NewGetAuditRequest() *GetAuditRequest`

NewGetAuditRequest instantiates a new GetAuditRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetAuditRequestWithDefaults

`func NewGetAuditRequestWithDefaults() *GetAuditRequest`

NewGetAuditRequestWithDefaults instantiates a new GetAuditRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAuditStartDate

`func (o *GetAuditRequest) GetAuditStartDate() time.Time`

GetAuditStartDate returns the AuditStartDate field if non-nil, zero value otherwise.

### GetAuditStartDateOk

`func (o *GetAuditRequest) GetAuditStartDateOk() (*time.Time, bool)`

GetAuditStartDateOk returns a tuple with the AuditStartDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditStartDate

`func (o *GetAuditRequest) SetAuditStartDate(v time.Time)`

SetAuditStartDate sets AuditStartDate field to given value.

### HasAuditStartDate

`func (o *GetAuditRequest) HasAuditStartDate() bool`

HasAuditStartDate returns a boolean if a field has been set.

### GetAuditEndDate

`func (o *GetAuditRequest) GetAuditEndDate() time.Time`

GetAuditEndDate returns the AuditEndDate field if non-nil, zero value otherwise.

### GetAuditEndDateOk

`func (o *GetAuditRequest) GetAuditEndDateOk() (*time.Time, bool)`

GetAuditEndDateOk returns a tuple with the AuditEndDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditEndDate

`func (o *GetAuditRequest) SetAuditEndDate(v time.Time)`

SetAuditEndDate sets AuditEndDate field to given value.

### HasAuditEndDate

`func (o *GetAuditRequest) HasAuditEndDate() bool`

HasAuditEndDate returns a boolean if a field has been set.

### GetIncludeProofs

`func (o *GetAuditRequest) GetIncludeProofs() bool`

GetIncludeProofs returns the IncludeProofs field if non-nil, zero value otherwise.

### GetIncludeProofsOk

`func (o *GetAuditRequest) GetIncludeProofsOk() (*bool, bool)`

GetIncludeProofsOk returns a tuple with the IncludeProofs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIncludeProofs

`func (o *GetAuditRequest) SetIncludeProofs(v bool)`

SetIncludeProofs sets IncludeProofs field to given value.

### HasIncludeProofs

`func (o *GetAuditRequest) HasIncludeProofs() bool`

HasIncludeProofs returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


