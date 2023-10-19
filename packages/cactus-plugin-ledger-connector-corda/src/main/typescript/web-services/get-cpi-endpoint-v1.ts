import { Express, Request, Response } from "express";
import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
  Configuration,
} from "@hyperledger/cactus-core-api";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  DefaultApi,
  CPIV5Response,
} from "../generated/openapi/typescript-axios";

import OAS from "../../json/openapi.json";
import https from "https";
export interface IListCPIEndpointV1Options {
  logLevel?: LogLevelDesc;
  apiUrl?: string;
}

export class ListCPIEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "ListCPIEndpointV1";

  private readonly log: Logger;
  private readonly apiUrl?: string;
  //private readonly authorizationOptionsProvider: AuthorizationOptionsProvider;
  //private readonly apiUrl?: string;

  public get className(): string {
    return ListCPIEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IListCPIEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} options`);

    this.log = LoggerProvider.getOrCreate({
      label: "list-cpi-endpoint-v1",
      level: options.logLevel || "INFO",
    });

    this.apiUrl = options.apiUrl;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }),
    };
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/cpi"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/cpi"
    ];
  }

  /**
   * Returns the endpoint path to be used when installing the endpoint into the
   * API server of Cactus.
   */
  public getPath(): string {
    return this.oasPath.get["x-hyperledger-cactus"].https.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.get["x-hyperledger-cactus"].https.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.get.operationId;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetCPIResponseV1#constructor()";
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    this.log.debug(`${verbUpper} ${this.getPath()}`);

    try {
      if (this.apiUrl === undefined) throw "apiUrl option is necessary";
      const body = await this.callInternalContainer(req.body);
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }

  async callInternalContainer(req: any): Promise<CPIV5Response> {
    const apiConfig = new Configuration({ basePath: this.apiUrl });
    const apiClient = new DefaultApi(apiConfig);
    const res = await apiClient.getCPIResponse(req);
    return res.data;
  }
}
