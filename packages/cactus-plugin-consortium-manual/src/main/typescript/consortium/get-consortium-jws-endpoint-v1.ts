import { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import { GetConsortiumJwsResponse } from "../generated/openapi/typescript-axios";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  IAsyncProvider,
  Checks,
} from "@hyperledger/cactus-common";

import {
  registerWebServiceEndpoint,
  ConsortiumRepository,
} from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";
import { PluginConsortiumManual } from "../plugin-consortium-manual";

export interface IGetConsortiumJwsEndpointOptions {
  plugin: PluginConsortiumManual;
  keyPairPem: string;
  consortiumRepo: ConsortiumRepository;
  logLevel?: LogLevelDesc;
}

export class GetConsortiumEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;
  private readonly plugin: PluginConsortiumManual;

  constructor(public readonly options: IGetConsortiumJwsEndpointOptions) {
    const fnTag = "GetConsortiumJwsEndpoint#constructor()";
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    if (!options.keyPairPem) {
      throw new Error(`${fnTag} options.keyPairPem falsy.`);
    }
    if (!options.consortiumRepo) {
      throw new Error(`${fnTag} options.consortium falsy.`);
    }
    Checks.truthy(options.plugin, `${fnTag} options.plugin`);
    Checks.truthy(
      options.plugin instanceof PluginConsortiumManual,
      `${fnTag} options.plugin instanceof PluginConsortiumManual`,
    );
    this.plugin = options.plugin;

    const label = "get-consortium-jws-endpoint";
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

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/consortium/jws"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/consortium/jws"
    ];
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetConsortiumJwsEndpointV1#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      const jws = await this.options.plugin.getConsortiumJws();

      const body: GetConsortiumJwsResponse = { jws };
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
