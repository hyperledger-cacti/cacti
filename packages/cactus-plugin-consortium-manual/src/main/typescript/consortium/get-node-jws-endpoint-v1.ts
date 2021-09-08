import { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import { GetNodeJwsResponse } from "../generated/openapi/typescript-axios";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  registerWebServiceEndpoint,
  ConsortiumRepository,
} from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";
import { PluginConsortiumManual } from "../plugin-consortium-manual";

export interface IGetNodeJwsEndpointOptions {
  plugin: PluginConsortiumManual;
  keyPairPem: string;
  consortiumRepo: ConsortiumRepository;
  logLevel?: LogLevelDesc;
}

export class GetNodeJwsEndpoint implements IWebServiceEndpoint {
  private readonly log: Logger;
  private readonly plugin: PluginConsortiumManual;

  constructor(public readonly options: IGetNodeJwsEndpointOptions) {
    const fnTag = "GetNodeJwsEndpoint#constructor()";
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    if (!options.keyPairPem) {
      throw new Error(`${fnTag} options.keyPairPem falsy.`);
    }
    Checks.truthy(options.consortiumRepo, `${fnTag} options.consortiumRepo`);
    Checks.truthy(options.plugin, `${fnTag} options.plugin`);
    Checks.truthy(
      options.plugin instanceof PluginConsortiumManual,
      `${fnTag} options.plugin instanceof PluginConsortiumManual`,
    );
    this.plugin = options.plugin;

    const level = options.logLevel || "INFO";
    const label = "get-node-jws-endpoint-v1";
    this.log = LoggerProvider.getOrCreate({ level, label });
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

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/node/jws"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/node/jws"
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
    const fnTag = "GetNodeJwsEndpoint#createJws()";
    this.log.debug(`GET ${this.getPath()}`);
    try {
      const jws = await this.options.plugin.getNodeJws();
      const body: GetNodeJwsResponse = { jws };
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
