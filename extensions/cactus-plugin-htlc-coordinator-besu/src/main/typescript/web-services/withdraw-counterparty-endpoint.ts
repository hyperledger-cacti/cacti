import { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import {
  registerWebServiceEndpoint,
  PluginRegistry,
} from "@hyperledger/cactus-core";
import { WithdrawCounterpartyRequest } from "../generated/openapi/typescript-axios";
import { PluginHTLCCoordinatorBesu } from "../plugin-htlc-coordinator-besu";
import OAS from "../../json/openapi.json";

export interface IWithdrawCounterpartyOptions {
  logLevel?: LogLevelDesc;
  pluginRegistry: PluginRegistry;
}

export class WithdrawCounterpartyEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "WithdrawCounterpartyEndpoint";
  private readonly log: Logger;

  public get className(): string {
    return WithdrawCounterpartyEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IWithdrawCounterpartyOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(
      options.pluginRegistry,
      `${fnTag} arg options.pluginRegistry`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-coordinator-besu/withdraw-counterparty"
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
    try {
      const request: WithdrawCounterpartyRequest = req.body as WithdrawCounterpartyRequest;
      const connector = (this.options.pluginRegistry.plugins.find((plugin) => {
        return (
          plugin.getPackageName() ==
          "@hyperledger/cactus-plugin-htlc-coordinator-besu"
        );
      }) as unknown) as PluginHTLCCoordinatorBesu;
      const resBody = await connector.withdrawCounterparty(request);
      res.json(resBody);
    } catch (ex) {
      res.status(500).json({
        message: "Internal Server Error",
        error: ex,
      });
    }
  }
}
