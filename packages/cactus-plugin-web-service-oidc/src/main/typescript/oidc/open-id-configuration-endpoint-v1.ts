import { Request, Response, NextFunction } from "express";
import { Provider } from "oidc-provider";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  ICactusPlugin,
} from "@hyperledger/cactus-core-api";

export interface IOpenIdConfigurationEndpointOptions {
  path: string;
  hostPlugin: ICactusPlugin;
  oidcProvider: Provider;
}

export class OpenIdConfigurationEndpointV1 implements IWebServiceEndpoint {
  constructor(public readonly options: IOpenIdConfigurationEndpointOptions) {
    if (!options) {
      throw new Error(`OpenIdConfigurationEndpointV1#ctor options falsy.`);
    }
    if (!options.oidcProvider) {
      throw new Error(
        `OpenIdConfigurationEndpointV1#ctor options.oidcProvider falsy.`
      );
    }
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return this.options.path;
  }

  async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    this.options.oidcProvider.callback(req, res);
  }
}
