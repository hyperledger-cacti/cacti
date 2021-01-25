// TODO: better import syntax?
import { BaseAPIRequestFactory, RequiredError } from './baseapi';
import {Configuration} from '../configuration';
import { RequestContext, HttpMethod, ResponseContext, HttpFile} from '../http/http';
import {ObjectSerializer} from '../models/ObjectSerializer';
import {ApiException} from './exception';
import {isCodeInRange} from '../util';

import { NewContractObj } from '../models/NewContractObj';

/**
 * no description
 */
export class DefaultApiRequestFactory extends BaseAPIRequestFactory {
	
    /**
     * @param id 
     */
    public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(id: string, options?: Configuration): Promise<RequestContext> {
		let config = options || this.configuration;
		
        // verify required parameter 'id' is not null or undefined
        if (id === null || id === undefined) {
            throw new RequiredError('Required parameter id was null or undefined when calling apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet.');
        }

		
		// Path Params
    	const localVarPath = '/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/getSingleStatus'
            .replace('{' + 'id' + '}', encodeURIComponent(String(id)));

		// Make Request Context
    	const requestContext = config.baseServer.makeRequestContext(localVarPath, HttpMethod.GET);
        requestContext.setHeaderParam("Accept", "application/json, */*;q=0.8")

        // Query Params
	
		// Header Params
	
		// Form Params


		// Body Params

        // Apply auth methods

        return requestContext;
    }

    /**
     * @param ids 
     */
    public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(ids: Array<string>, options?: Configuration): Promise<RequestContext> {
		let config = options || this.configuration;
		
        // verify required parameter 'ids' is not null or undefined
        if (ids === null || ids === undefined) {
            throw new RequiredError('Required parameter ids was null or undefined when calling apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet.');
        }

		
		// Path Params
    	const localVarPath = '/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/getStatus';

		// Make Request Context
    	const requestContext = config.baseServer.makeRequestContext(localVarPath, HttpMethod.GET);
        requestContext.setHeaderParam("Accept", "application/json, */*;q=0.8")

        // Query Params
        if (ids !== undefined) {
        	requestContext.setQueryParam("ids", ObjectSerializer.serialize(ids, "Array<string>", "bytes32"));
        }
	
		// Header Params
	
		// Form Params


		// Body Params

        // Apply auth methods

        return requestContext;
    }

    /**
     * @param newContractObj 
     */
    public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(newContractObj?: NewContractObj, options?: Configuration): Promise<RequestContext> {
		let config = options || this.configuration;
		
		
		// Path Params
    	const localVarPath = '/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/newContract';

		// Make Request Context
    	const requestContext = config.baseServer.makeRequestContext(localVarPath, HttpMethod.POST);
        requestContext.setHeaderParam("Accept", "application/json, */*;q=0.8")

        // Query Params
	
		// Header Params
	
		// Form Params


		// Body Params
        const contentType = ObjectSerializer.getPreferredMediaType([
            "application/json"
        ]);
        requestContext.setHeaderParam("Content-Type", contentType);
        const serializedBody = ObjectSerializer.stringify(
            ObjectSerializer.serialize(newContractObj, "NewContractObj", ""),
            contentType
        );
        requestContext.setBody(serializedBody);

        // Apply auth methods

        return requestContext;
    }

    /**
     * @param id 
     */
    public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(id: string, options?: Configuration): Promise<RequestContext> {
		let config = options || this.configuration;
		
        // verify required parameter 'id' is not null or undefined
        if (id === null || id === undefined) {
            throw new RequiredError('Required parameter id was null or undefined when calling apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost.');
        }

		
		// Path Params
    	const localVarPath = '/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/refund'
            .replace('{' + 'id' + '}', encodeURIComponent(String(id)));

		// Make Request Context
    	const requestContext = config.baseServer.makeRequestContext(localVarPath, HttpMethod.POST);
        requestContext.setHeaderParam("Accept", "application/json, */*;q=0.8")

        // Query Params
	
		// Header Params
	
		// Form Params


		// Body Params

        // Apply auth methods

        return requestContext;
    }

    /**
     * @param id 
     * @param secret 
     */
    public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(id: string, secret: string, options?: Configuration): Promise<RequestContext> {
		let config = options || this.configuration;
		
        // verify required parameter 'id' is not null or undefined
        if (id === null || id === undefined) {
            throw new RequiredError('Required parameter id was null or undefined when calling apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost.');
        }

		
        // verify required parameter 'secret' is not null or undefined
        if (secret === null || secret === undefined) {
            throw new RequiredError('Required parameter secret was null or undefined when calling apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost.');
        }

		
		// Path Params
    	const localVarPath = '/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/withdraw'
            .replace('{' + 'id' + '}', encodeURIComponent(String(id)))
            .replace('{' + 'secret' + '}', encodeURIComponent(String(secret)));

		// Make Request Context
    	const requestContext = config.baseServer.makeRequestContext(localVarPath, HttpMethod.POST);
        requestContext.setHeaderParam("Accept", "application/json, */*;q=0.8")

        // Query Params
	
		// Header Params
	
		// Form Params


		// Body Params

        // Apply auth methods

        return requestContext;
    }

}



export class DefaultApiResponseProcessor {

    /**
     * Unwraps the actual response sent by the server from the response context and deserializes the response content
     * to the expected objects
     *
     * @params response Response returned by the server for a request to apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet
     * @throws ApiException if the response code was not in [200, 299]
     */
     public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(response: ResponseContext): Promise<number > {
        const contentType = ObjectSerializer.normalizeMediaType(response.headers["content-type"]);
        if (isCodeInRange("200", response.httpStatusCode)) {
            const body: number = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "number", "uint256"
            ) as number;
            return body;
        }

        // Work around for missing responses in specification, e.g. for petstore.yaml
        if (response.httpStatusCode >= 200 && response.httpStatusCode <= 299) {
            const body: number = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "number", "uint256"
            ) as number;
            return body;
        }

        let body = response.body || "";
    	throw new ApiException<string>(response.httpStatusCode, "Unknown API Status Code!\nBody: \"" + body + "\"");
    }
			
    /**
     * Unwraps the actual response sent by the server from the response context and deserializes the response content
     * to the expected objects
     *
     * @params response Response returned by the server for a request to apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet
     * @throws ApiException if the response code was not in [200, 299]
     */
     public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(response: ResponseContext): Promise<Array<number> > {
        const contentType = ObjectSerializer.normalizeMediaType(response.headers["content-type"]);
        if (isCodeInRange("200", response.httpStatusCode)) {
            const body: Array<number> = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "Array<number>", "uint256"
            ) as Array<number>;
            return body;
        }

        // Work around for missing responses in specification, e.g. for petstore.yaml
        if (response.httpStatusCode >= 200 && response.httpStatusCode <= 299) {
            const body: Array<number> = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "Array<number>", "uint256"
            ) as Array<number>;
            return body;
        }

        let body = response.body || "";
    	throw new ApiException<string>(response.httpStatusCode, "Unknown API Status Code!\nBody: \"" + body + "\"");
    }
			
    /**
     * Unwraps the actual response sent by the server from the response context and deserializes the response content
     * to the expected objects
     *
     * @params response Response returned by the server for a request to apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost
     * @throws ApiException if the response code was not in [200, 299]
     */
     public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(response: ResponseContext): Promise<string > {
        const contentType = ObjectSerializer.normalizeMediaType(response.headers["content-type"]);
        if (isCodeInRange("200", response.httpStatusCode)) {
            const body: string = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "string", "bytes32"
            ) as string;
            return body;
        }

        // Work around for missing responses in specification, e.g. for petstore.yaml
        if (response.httpStatusCode >= 200 && response.httpStatusCode <= 299) {
            const body: string = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "string", "bytes32"
            ) as string;
            return body;
        }

        let body = response.body || "";
    	throw new ApiException<string>(response.httpStatusCode, "Unknown API Status Code!\nBody: \"" + body + "\"");
    }
			
    /**
     * Unwraps the actual response sent by the server from the response context and deserializes the response content
     * to the expected objects
     *
     * @params response Response returned by the server for a request to apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost
     * @throws ApiException if the response code was not in [200, 299]
     */
     public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(response: ResponseContext): Promise<string > {
        const contentType = ObjectSerializer.normalizeMediaType(response.headers["content-type"]);
        if (isCodeInRange("200", response.httpStatusCode)) {
            const body: string = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "string", "bytes32"
            ) as string;
            return body;
        }

        // Work around for missing responses in specification, e.g. for petstore.yaml
        if (response.httpStatusCode >= 200 && response.httpStatusCode <= 299) {
            const body: string = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "string", "bytes32"
            ) as string;
            return body;
        }

        let body = response.body || "";
    	throw new ApiException<string>(response.httpStatusCode, "Unknown API Status Code!\nBody: \"" + body + "\"");
    }
			
    /**
     * Unwraps the actual response sent by the server from the response context and deserializes the response content
     * to the expected objects
     *
     * @params response Response returned by the server for a request to apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost
     * @throws ApiException if the response code was not in [200, 299]
     */
     public async apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(response: ResponseContext): Promise<string > {
        const contentType = ObjectSerializer.normalizeMediaType(response.headers["content-type"]);
        if (isCodeInRange("200", response.httpStatusCode)) {
            const body: string = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "string", "bytes32"
            ) as string;
            return body;
        }

        // Work around for missing responses in specification, e.g. for petstore.yaml
        if (response.httpStatusCode >= 200 && response.httpStatusCode <= 299) {
            const body: string = ObjectSerializer.deserialize(
                ObjectSerializer.parse(await response.body.text(), contentType),
                "string", "bytes32"
            ) as string;
            return body;
        }

        let body = response.body || "";
    	throw new ApiException<string>(response.httpStatusCode, "Unknown API Status Code!\nBody: \"" + body + "\"");
    }
			
}
