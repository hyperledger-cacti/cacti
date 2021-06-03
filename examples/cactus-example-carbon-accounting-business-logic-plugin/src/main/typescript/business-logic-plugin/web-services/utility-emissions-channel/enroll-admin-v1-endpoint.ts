import { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { EnrollAdminV1Request } from "../../../generated/openapi/typescript-axios";
import { CarbonAccountingPlugin } from "../../carbon-accounting-plugin";
import OAS from "../../../../json/openapi.json";

export interface IEnrollAdminV1EndpointOptions {
  logLevel?: LogLevelDesc;
  plugin: CarbonAccountingPlugin;
}

export class EnrollAdminV1Endpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "EnrollAdminV1Endpoint ";

  private readonly log: Logger;

  public get className(): string {
    return EnrollAdminV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IEnrollAdminV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async registerExpress(app: Express): Promise<IWebServiceEndpoint> {
    registerWebServiceEndpoint(app, this);
    return this;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => this.oasPath.post["x-hyperledger-cactus"].authz,
    };
  }

  public get oasPath(): any {
    return OAS.paths["/api/v1/utilityemissionchannel/registerEnroll/admin"];
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      const reqBody = req.body as EnrollAdminV1Request;
      this.log.debug(`${tag} %o`, reqBody);
      const resBody = await this.opts.plugin.enrollAdminV1(reqBody);
      res.status(200);
      res.json(resBody);
    } catch (ex) {
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
