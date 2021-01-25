import { ResponseContext, RequestContext, HttpFile } from '../http/http';
import * as models from '../models/all';
import { Configuration} from '../configuration'

import { NewContractObj } from '../models/NewContractObj';

import { ObservableDefaultApi } from "./ObservableAPI";
import { DefaultApiRequestFactory, DefaultApiResponseProcessor} from "../apis/DefaultApi";

export interface DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGetRequest {
    /**
     * 
     * @type string
     * @memberof DefaultApiapiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet
     */
    id: string
}

export interface DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGetRequest {
    /**
     * 
     * @type Array&lt;string&gt;
     * @memberof DefaultApiapiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet
     */
    ids: Array<string>
}

export interface DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPostRequest {
    /**
     * 
     * @type NewContractObj
     * @memberof DefaultApiapiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost
     */
    newContractObj?: NewContractObj
}

export interface DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPostRequest {
    /**
     * 
     * @type string
     * @memberof DefaultApiapiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost
     */
    id: string
}

export interface DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPostRequest {
    /**
     * 
     * @type string
     * @memberof DefaultApiapiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost
     */
    id: string
    /**
     * 
     * @type string
     * @memberof DefaultApiapiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost
     */
    secret: string
}


export class ObjectDefaultApi {
    private api: ObservableDefaultApi

    public constructor(configuration: Configuration, requestFactory?: DefaultApiRequestFactory, responseProcessor?: DefaultApiResponseProcessor) {
        this.api = new ObservableDefaultApi(configuration, requestFactory, responseProcessor);
	}

    /**
     * @param param the request object
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(param: DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGetRequest, options?: Configuration): Promise<number> {
        return this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(param.id,  options).toPromise();
    }
	
    /**
     * @param param the request object
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(param: DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGetRequest, options?: Configuration): Promise<Array<number>> {
        return this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(param.ids,  options).toPromise();
    }
	
    /**
     * @param param the request object
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(param: DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPostRequest, options?: Configuration): Promise<string> {
        return this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(param.newContractObj,  options).toPromise();
    }
	
    /**
     * @param param the request object
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(param: DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPostRequest, options?: Configuration): Promise<string> {
        return this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(param.id,  options).toPromise();
    }
	
    /**
     * @param param the request object
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(param: DefaultApiApiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPostRequest, options?: Configuration): Promise<string> {
        return this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(param.id, param.secret,  options).toPromise();
    }
	

}



