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

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorStub } from "../plugin-ledger-connector-stub";

export interface IDeployContractEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorStub;
}

export class DeployContractEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployContractEndpoint";
  public static readonly OAUTH2_SCOPES = ["cactus:stub:deploy-contract"];

  private readonly log: Logger;

  public get className(): string {
    return DeployContractEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IDeployContractEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath() {
    return {
      post: {
        operationId: "deployContractV1",
        "x-hyperledger-cactus": {
          http: {
            path:
              "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-stub/deploy-contract-stub",
            verbLowerCase: "post",
          },
        },
      },
    };
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
        requiredRoles: DeployContractEndpoint.OAUTH2_SCOPES,
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
    const reqBody: unknown = req.body;
    try {
      const resBody = await this.options.connector.deployContract(reqBody);
      res.json(resBody);
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
