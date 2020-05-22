import { Request, Response, NextFunction } from "express";
import { Provider } from "oidc-provider";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  ICactusPlugin,
} from "@hyperledger/cactus-core-api";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

export interface IOpenIdConfigurationEndpointOptions {
  path: string;
  hostPlugin: ICactusPlugin;
  oidcProvider: Provider;
}

export class OpenIdConfigurationEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly options: IOpenIdConfigurationEndpointOptions) {
    if (!options) {
      throw new Error(`OpenIdConfigurationEndpointV1#ctor options falsy.`);
    }
    if (!options.oidcProvider) {
      throw new Error(
        `OpenIdConfigurationEndpointV1#ctor options.oidcProvider falsy.`
      );
    }
    this.log = LoggerProvider.getOrCreate({
      label: "open-id-configuration-endpoint-v1",
    });
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
    this.log.debug(`GET ${this.getPath()}`);
    this.options.oidcProvider.callback(req, res);
  }
}
