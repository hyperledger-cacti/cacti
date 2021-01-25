import { ResponseContext, RequestContext, HttpFile } from '../http/http';
import * as models from '../models/all';
import { Configuration} from '../configuration'

import { NewContractObj } from '../models/NewContractObj';
import { ObservableDefaultApi } from './ObservableAPI';


import { DefaultApiRequestFactory, DefaultApiResponseProcessor} from "../apis/DefaultApi";
export class PromiseDefaultApi {
    private api: ObservableDefaultApi

    public constructor(
        configuration: Configuration,
        requestFactory?: DefaultApiRequestFactory,
        responseProcessor?: DefaultApiResponseProcessor
    ) {
        this.api = new ObservableDefaultApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * @param id 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(id: string, options?: Configuration): Promise<number> {
    	const result = this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(id, options);
        return result.toPromise();
    }
	
    /**
     * @param ids 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(ids: Array<string>, options?: Configuration): Promise<Array<number>> {
    	const result = this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(ids, options);
        return result.toPromise();
    }
	
    /**
     * @param newContractObj 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(newContractObj?: NewContractObj, options?: Configuration): Promise<string> {
    	const result = this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(newContractObj, options);
        return result.toPromise();
    }
	
    /**
     * @param id 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(id: string, options?: Configuration): Promise<string> {
    	const result = this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(id, options);
        return result.toPromise();
    }
	
    /**
     * @param id 
     * @param secret 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(id: string, secret: string, options?: Configuration): Promise<string> {
    	const result = this.api.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(id, secret, options);
        return result.toPromise();
    }
	

}



