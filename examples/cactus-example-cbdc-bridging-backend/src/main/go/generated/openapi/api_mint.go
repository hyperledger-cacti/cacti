/*
CBDC-example backend API

Cactus-Example 

API version: 0.0.2
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package generated

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/url"
)


type MintAPI interface {

	/*
	Mint Submit a transaction intent

	Allows users to queue intents for transactions based on specified parameters.

	@param ctx context.Context - for authentication, logging, cancellation, deadlines, tracing, etc. Passed from http.Request or context.Background().
	@return ApiMintRequest
	*/
	Mint(ctx context.Context) ApiMintRequest

	// MintExecute executes the request
	MintExecute(r ApiMintRequest) (*http.Response, error)
}

// MintAPIService MintAPI service
type MintAPIService service

type ApiMintRequest struct {
	ctx context.Context
	ApiService MintAPI
	mintRequest *MintRequest
}

func (r ApiMintRequest) MintRequest(mintRequest MintRequest) ApiMintRequest {
	r.mintRequest = &mintRequest
	return r
}

func (r ApiMintRequest) Execute() (*http.Response, error) {
	return r.ApiService.MintExecute(r)
}

/*
Mint Submit a transaction intent

Allows users to queue intents for transactions based on specified parameters.

 @param ctx context.Context - for authentication, logging, cancellation, deadlines, tracing, etc. Passed from http.Request or context.Background().
 @return ApiMintRequest
*/
func (a *MintAPIService) Mint(ctx context.Context) ApiMintRequest {
	return ApiMintRequest{
		ApiService: a,
		ctx: ctx,
	}
}

// Execute executes the request
func (a *MintAPIService) MintExecute(r ApiMintRequest) (*http.Response, error) {
	var (
		localVarHTTPMethod   = http.MethodPost
		localVarPostBody     interface{}
		formFiles            []formFile
	)

	localBasePath, err := a.client.cfg.ServerURLWithContext(r.ctx, "MintAPIService.Mint")
	if err != nil {
		return nil, &GenericOpenAPIError{error: err.Error()}
	}

	localVarPath := localBasePath + "/api/v1/@hyperledger/cactus-example-cbdc/mint-tokens"

	localVarHeaderParams := make(map[string]string)
	localVarQueryParams := url.Values{}
	localVarFormParams := url.Values{}
	if r.mintRequest == nil {
		return nil, reportError("mintRequest is required and must be specified")
	}

	// to determine the Content-Type header
	localVarHTTPContentTypes := []string{"application/json"}

	// set Content-Type header
	localVarHTTPContentType := selectHeaderContentType(localVarHTTPContentTypes)
	if localVarHTTPContentType != "" {
		localVarHeaderParams["Content-Type"] = localVarHTTPContentType
	}

	// to determine the Accept header
	localVarHTTPHeaderAccepts := []string{"application/json"}

	// set Accept header
	localVarHTTPHeaderAccept := selectHeaderAccept(localVarHTTPHeaderAccepts)
	if localVarHTTPHeaderAccept != "" {
		localVarHeaderParams["Accept"] = localVarHTTPHeaderAccept
	}
	// body params
	localVarPostBody = r.mintRequest
	req, err := a.client.prepareRequest(r.ctx, localVarPath, localVarHTTPMethod, localVarPostBody, localVarHeaderParams, localVarQueryParams, localVarFormParams, formFiles)
	if err != nil {
		return nil, err
	}

	localVarHTTPResponse, err := a.client.callAPI(req)
	if err != nil || localVarHTTPResponse == nil {
		return localVarHTTPResponse, err
	}

	localVarBody, err := io.ReadAll(localVarHTTPResponse.Body)
	localVarHTTPResponse.Body.Close()
	localVarHTTPResponse.Body = io.NopCloser(bytes.NewBuffer(localVarBody))
	if err != nil {
		return localVarHTTPResponse, err
	}

	if localVarHTTPResponse.StatusCode >= 300 {
		newErr := &GenericOpenAPIError{
			body:  localVarBody,
			error: localVarHTTPResponse.Status,
		}
			var v APIError
			err = a.client.decode(&v, localVarBody, localVarHTTPResponse.Header.Get("Content-Type"))
			if err != nil {
				newErr.error = err.Error()
				return localVarHTTPResponse, newErr
			}
					newErr.error = formatErrorMessage(localVarHTTPResponse.Status, &v)
					newErr.model = v
		return localVarHTTPResponse, newErr
	}

	return localVarHTTPResponse, nil
}