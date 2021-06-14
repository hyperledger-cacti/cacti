import { Express, Request, Response } from "express";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Checks,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import { OdapGateway } from "../gateway/odap-gateway";

export interface ITransferInitiateEndpointV1Options {
  gateway: OdapGateway;
  logLevel?: LogLevelDesc;
}

export class TransferInitiateEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly options: ITransferInitiateEndpointV1Options) {
    const fnTag = "TransferInitiateEndpointV1#constructor()";

    Checks.truthy(options, `${fnTag} options`);

    const label = "transfer-initiate-endpoint";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    // TODO: make this an injectable dependency in the constructor
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return OAS.paths["/api/v1/transferinitiation"].get["x-hyperledger-cactus"]
      .http.path;
  }

  getVerbLowerCase(): string {
    return OAS.paths["/api/v1/transferinitiation"].get["x-hyperledger-cactus"]
      .http.verbLowerCase;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "TransferInitiate#handleRequest()";
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    this.log.debug(`${verbUpper} ${this.getPath()}`);

    try {
      const resBody = await this.options.gateway.InitiateTransfer;
      res.status(200);
      res.send(resBody);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
