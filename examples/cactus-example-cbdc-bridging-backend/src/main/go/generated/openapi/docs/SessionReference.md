# SessionReference

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Status** | **string** |  | 
**SourceLedger** | **string** |  | 
**ReceiverLedger** | **string** |  | 

## Methods

### NewSessionReference

`func NewSessionReference(id string, status string, sourceLedger string, receiverLedger string, ) *SessionReference`

NewSessionReference instantiates a new SessionReference object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSessionReferenceWithDefaults

`func NewSessionReferenceWithDefaults() *SessionReference`

NewSessionReferenceWithDefaults instantiates a new SessionReference object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *SessionReference) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *SessionReference) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *SessionReference) SetId(v string)`

SetId sets Id field to given value.


### GetStatus

`func (o *SessionReference) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *SessionReference) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *SessionReference) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetSourceLedger

`func (o *SessionReference) GetSourceLedger() string`

GetSourceLedger returns the SourceLedger field if non-nil, zero value otherwise.

### GetSourceLedgerOk

`func (o *SessionReference) GetSourceLedgerOk() (*string, bool)`

GetSourceLedgerOk returns a tuple with the SourceLedger field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceLedger

`func (o *SessionReference) SetSourceLedger(v string)`

SetSourceLedger sets SourceLedger field to given value.


### GetReceiverLedger

`func (o *SessionReference) GetReceiverLedger() string`

GetReceiverLedger returns the ReceiverLedger field if non-nil, zero value otherwise.

### GetReceiverLedgerOk

`func (o *SessionReference) GetReceiverLedgerOk() (*string, bool)`

GetReceiverLedgerOk returns a tuple with the ReceiverLedger field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReceiverLedger

`func (o *SessionReference) SetReceiverLedger(v string)`

SetReceiverLedger sets ReceiverLedger field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


