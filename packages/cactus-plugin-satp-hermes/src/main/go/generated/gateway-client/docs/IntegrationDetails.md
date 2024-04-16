# IntegrationDetails

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Key** | **string** | A unique identifier for the integration or tool. | 
**Name** | **string** | The name of the integration or tool. | 
**LogoURI** | **string** | URL to the logo of the integration or tool. | 

## Methods

### NewIntegrationDetails

`func NewIntegrationDetails(key string, name string, logoURI string, ) *IntegrationDetails`

NewIntegrationDetails instantiates a new IntegrationDetails object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewIntegrationDetailsWithDefaults

`func NewIntegrationDetailsWithDefaults() *IntegrationDetails`

NewIntegrationDetailsWithDefaults instantiates a new IntegrationDetails object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetKey

`func (o *IntegrationDetails) GetKey() string`

GetKey returns the Key field if non-nil, zero value otherwise.

### GetKeyOk

`func (o *IntegrationDetails) GetKeyOk() (*string, bool)`

GetKeyOk returns a tuple with the Key field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKey

`func (o *IntegrationDetails) SetKey(v string)`

SetKey sets Key field to given value.


### GetName

`func (o *IntegrationDetails) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *IntegrationDetails) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *IntegrationDetails) SetName(v string)`

SetName sets Name field to given value.


### GetLogoURI

`func (o *IntegrationDetails) GetLogoURI() string`

GetLogoURI returns the LogoURI field if non-nil, zero value otherwise.

### GetLogoURIOk

`func (o *IntegrationDetails) GetLogoURIOk() (*string, bool)`

GetLogoURIOk returns a tuple with the LogoURI field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLogoURI

`func (o *IntegrationDetails) SetLogoURI(v string)`

SetLogoURI sets LogoURI field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


