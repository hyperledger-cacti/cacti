import { Express, Request, Response } from "express";
import { Provider } from "oidc-provider";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  ICactusPlugin,
} from "@hyperledger/cactus-core-api";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import { OpenIdConfigurationEndpointV1 as Constants } from "./open-id-configuration-endpoint-v1-constants";

export interface IOpenIdConfigurationEndpointOptions {
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
        `OpenIdConfigurationEndpointV1#ctor options.oidcProvider falsy.`,
      );
    }
    this.log = LoggerProvider.getOrCreate({
      label: "open-id-configuration-endpoint-v1",
    });
  }

  public getVerbLowerCase(): string {
    return Constants.HTTP_VERB_LOWER_CASE;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getPath(): string {
    return Constants.HTTP_PATH;
  }

  public registerExpress(expressApp: Express): IWebServiceEndpoint {
    const fnTag = "registerWebServiceEndpoint";
    const httpVerb = this.getVerbLowerCase();
    const httpPath = this.getPath();
    const requestHandler = this.getExpressRequestHandler();

    const registrationMethod = (expressApp as any)[httpVerb].bind(expressApp);
    try {
      registrationMethod(httpPath, requestHandler);
      return this;
    } catch (ex) {
      throw new Error(
        `${fnTag} Express verb method ${httpVerb} threw ` +
          ` while registering endpoint: ${ex.message}`,
      );
    }
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    this.log.debug(`GET ${this.getPath()}`);
    this.options.oidcProvider.callback(req, res);
  }
}
