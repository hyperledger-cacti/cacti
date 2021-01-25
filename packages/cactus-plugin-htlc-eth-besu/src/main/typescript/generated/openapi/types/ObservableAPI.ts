import { ResponseContext, RequestContext, HttpFile } from '../http/http';
import * as models from '../models/all';
import { Configuration} from '../configuration'
import { Observable, of, from } from '../rxjsStub';
import {mergeMap, map} from  '../rxjsStub';

import { NewContractObj } from '../models/NewContractObj';

import { DefaultApiRequestFactory, DefaultApiResponseProcessor} from "../apis/DefaultApi";
export class ObservableDefaultApi {
    private requestFactory: DefaultApiRequestFactory;
    private responseProcessor: DefaultApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: DefaultApiRequestFactory,
        responseProcessor?: DefaultApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new DefaultApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new DefaultApiResponseProcessor();
    }

    /**
     * @param id 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(id: string, options?: Configuration): Observable<number> {
    	const requestContextPromise = this.requestFactory.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(id, options);

		// build promise chain
    let middlewarePreObservable = from<RequestContext>(requestContextPromise);
    	for (let middleware of this.configuration.middleware) {
    		middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
    	}

    	return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => this.configuration.httpApi.send(ctx))).
	    	pipe(mergeMap((response: ResponseContext) => {
	    		let middlewarePostObservable = of(response);
	    		for (let middleware of this.configuration.middleware) {
	    			middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
	    		}
	    		return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetSingleStatusGet(rsp)));
	    	}));
    }
	
    /**
     * @param ids 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(ids: Array<string>, options?: Configuration): Observable<Array<number>> {
    	const requestContextPromise = this.requestFactory.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(ids, options);

		// build promise chain
    let middlewarePreObservable = from<RequestContext>(requestContextPromise);
    	for (let middleware of this.configuration.middleware) {
    		middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
    	}

    	return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => this.configuration.httpApi.send(ctx))).
	    	pipe(mergeMap((response: ResponseContext) => {
	    		let middlewarePostObservable = of(response);
	    		for (let middleware of this.configuration.middleware) {
	    			middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
	    		}
	    		return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuGetStatusGet(rsp)));
	    	}));
    }
	
    /**
     * @param newContractObj 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(newContractObj?: NewContractObj, options?: Configuration): Observable<string> {
    	const requestContextPromise = this.requestFactory.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(newContractObj, options);

		// build promise chain
    let middlewarePreObservable = from<RequestContext>(requestContextPromise);
    	for (let middleware of this.configuration.middleware) {
    		middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
    	}

    	return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => this.configuration.httpApi.send(ctx))).
	    	pipe(mergeMap((response: ResponseContext) => {
	    		let middlewarePostObservable = of(response);
	    		for (let middleware of this.configuration.middleware) {
	    			middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
	    		}
	    		return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuNewContractPost(rsp)));
	    	}));
    }
	
    /**
     * @param id 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(id: string, options?: Configuration): Observable<string> {
    	const requestContextPromise = this.requestFactory.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(id, options);

		// build promise chain
    let middlewarePreObservable = from<RequestContext>(requestContextPromise);
    	for (let middleware of this.configuration.middleware) {
    		middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
    	}

    	return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => this.configuration.httpApi.send(ctx))).
	    	pipe(mergeMap((response: ResponseContext) => {
	    		let middlewarePostObservable = of(response);
	    		for (let middleware of this.configuration.middleware) {
	    			middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
	    		}
	    		return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuRefundPost(rsp)));
	    	}));
    }
	
    /**
     * @param id 
     * @param secret 
     */
    public apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(id: string, secret: string, options?: Configuration): Observable<string> {
    	const requestContextPromise = this.requestFactory.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(id, secret, options);

		// build promise chain
    let middlewarePreObservable = from<RequestContext>(requestContextPromise);
    	for (let middleware of this.configuration.middleware) {
    		middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
    	}

    	return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => this.configuration.httpApi.send(ctx))).
	    	pipe(mergeMap((response: ResponseContext) => {
	    		let middlewarePostObservable = of(response);
	    		for (let middleware of this.configuration.middleware) {
	    			middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
	    		}
	    		return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.apiV1PluginsHyperledgerCactusPluginHtlcEthBesuWithdrawPost(rsp)));
	    	}));
    }
	

}



