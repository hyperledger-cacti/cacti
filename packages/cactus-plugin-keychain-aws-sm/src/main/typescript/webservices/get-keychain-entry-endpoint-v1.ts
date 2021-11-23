import type { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import {
  GetKeychainEntryRequestV1,
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";
import { PluginKeychainAwsSm } from "../plugin-keychain-aws-sm";

export interface IGetKeychainEntryEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginKeychainAwsSm;
}

export class GetKeychainEntryV1Endpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetKeychainEntryV1Endpoint";

  private readonly log: Logger;

  public get className(): string {
    return GetKeychainEntryV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly options: IGetKeychainEntryEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-keychain-aws-sm/get-keychain-entry"
    ];
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.getOasPath().post.operationId;
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

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    const { key } = req.body as GetKeychainEntryRequestV1;
    //const reqBody = req.body;
    try {
      const value = await this.options.connector.get(key);
      //const resBody = await this.options.connector.get(reqBody.key);
      res.json({ key, value });
    } catch (ex) {
      if (ex?.message?.includes(`${key} secret not found`)) {
        res.status(404).json({
          key,
          error: ex?.stack || ex?.message,
        });
      } else {
        this.log.error(`Crash while serving ${reqTag}`, ex);
        res.status(500).json({
          message: "Internal Server Error",
          error: ex?.stack || ex?.message,
        });
      }
    }
  }
}
