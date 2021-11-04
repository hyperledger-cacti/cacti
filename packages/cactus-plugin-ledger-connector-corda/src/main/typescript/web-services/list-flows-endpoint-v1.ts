import { Express, Request, Response } from "express";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
  Configuration,
} from "@hyperledger/cactus-core-api";

import OAS from "../../json/openapi.json";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import {
  DefaultApi,
  ListFlowsV1Request,
  ListFlowsV1Response,
} from "../generated/openapi/typescript-axios";

export interface IListFlowsEndpointV1Options {
  logLevel?: LogLevelDesc;
  apiUrl?: string;
}

export class ListFlowsEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "ListFlowsEndpointV1";

  private readonly log: Logger;
  private readonly apiUrl?: string;

  public get className(): string {
    return ListFlowsEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IListFlowsEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} options`);

    this.log = LoggerProvider.getOrCreate({
      label: "list-flows-endpoint-v1",
      level: options.logLevel || "INFO",
    });

    this.apiUrl = options.apiUrl;
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

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flows"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flows"
    ];
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "ListFlowsEndpointV1#handleRequest()";
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    this.log.debug(`${verbUpper} ${this.getPath()}`);
    try {
      if (this.apiUrl === undefined) throw "apiUrl option is necessary";
      const resBody = await this.callInternalContainer(req.body);
      res.status(200);
      res.send(resBody);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }

  async callInternalContainer(
    req: ListFlowsV1Request,
  ): Promise<ListFlowsV1Response> {
    const apiConfig = new Configuration({ basePath: this.apiUrl });
    const apiClient = new DefaultApi(apiConfig);
    const res = await apiClient.listFlowsV1(req);
    return res.data;
  }
}
