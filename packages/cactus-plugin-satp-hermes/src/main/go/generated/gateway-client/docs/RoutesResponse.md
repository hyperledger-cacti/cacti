# RoutesResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Routes** | [**[]GetRoutes200ResponseRoutesInner**](GetRoutes200ResponseRoutesInner.md) | A collection of route objects | 

## Methods

### NewRoutesResponse

`func NewRoutesResponse(routes []GetRoutes200ResponseRoutesInner, ) *RoutesResponse`

NewRoutesResponse instantiates a new RoutesResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRoutesResponseWithDefaults

`func NewRoutesResponseWithDefaults() *RoutesResponse`

NewRoutesResponseWithDefaults instantiates a new RoutesResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetRoutes

`func (o *RoutesResponse) GetRoutes() []GetRoutes200ResponseRoutesInner`

GetRoutes returns the Routes field if non-nil, zero value otherwise.

### GetRoutesOk

`func (o *RoutesResponse) GetRoutesOk() (*[]GetRoutes200ResponseRoutesInner, bool)`

GetRoutesOk returns a tuple with the Routes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoutes

`func (o *RoutesResponse) SetRoutes(v []GetRoutes200ResponseRoutesInner)`

SetRoutes sets Routes field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


