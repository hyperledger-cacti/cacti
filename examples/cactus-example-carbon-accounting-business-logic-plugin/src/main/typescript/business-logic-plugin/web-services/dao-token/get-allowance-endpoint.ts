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

import { DaoTokenGetAllowanceRequest } from "../../../generated/openapi/typescript-axios";
import { CarbonAccountingPlugin } from "../../carbon-accounting-plugin";
import OAS from "../../../../json/openapi.json";

export interface IGetAllowanceEndpointOptions {
  logLevel?: LogLevelDesc;
  plugin: CarbonAccountingPlugin;
}

export class GetAllowanceEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetAllowanceEndpoint ";

  private readonly log: Logger;

  public get className(): string {
    return GetAllowanceEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IGetAllowanceEndpointOptions) {
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
    // TODO: make this an injectable dependency in the constructor
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public get oasPath(): { post: any } {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-carbon-accounting-backend/dao-token/get-allowance"
    ];
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
      const reqBody = req.body as DaoTokenGetAllowanceRequest;
      this.log.debug(`${tag} %o`, reqBody);
      const resBody = await Promise.resolve("dummy-response-fixme");
      res.status(200);
      res.json(resBody);
    } catch (ex) {
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
