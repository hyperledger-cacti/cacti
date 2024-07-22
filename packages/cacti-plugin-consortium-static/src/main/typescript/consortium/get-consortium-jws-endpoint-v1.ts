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
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";
import { PluginConsortiumStatic } from "../plugin-consortium-static";
import { StaticConsortiumRepository } from "../repository/static-consortium-repository";

export interface IGetConsortiumJwsEndpointOptions {
  plugin: PluginConsortiumStatic;
  keyPairPem: string;
  consortiumRepo: StaticConsortiumRepository;
  logLevel?: LogLevelDesc;
}

export class GetConsortiumEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetConsortiumEndpointV1";

  private readonly log: Logger;
  private readonly plugin: PluginConsortiumStatic;

  constructor(public readonly options: IGetConsortiumJwsEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
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
      options.plugin instanceof PluginConsortiumStatic,
      `${fnTag} options.plugin instanceof PluginConsortiumStatic`,
    );
    this.plugin = options.plugin;

    const label = "get-consortium-jws-endpoint";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
  }

  public get className(): string {
    return GetConsortiumEndpointV1.CLASS_NAME;
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

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cacti-plugin-consortium-static/consortium/jws"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cacti-plugin-consortium-static/consortium/jws"
    ];
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      const jws = await this.options.plugin.getConsortiumJws();

      const body: GetConsortiumJwsResponse = { jws };
      res.status(200);
      res.json(body);
    } catch (ex: unknown) {
      const errorMsg = `${fnTag} request handler fn crashed for: ${reqTag}`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
