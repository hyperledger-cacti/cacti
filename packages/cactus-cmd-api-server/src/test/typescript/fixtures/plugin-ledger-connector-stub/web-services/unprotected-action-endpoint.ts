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

import { PluginLedgerConnectorStub } from "../plugin-ledger-connector-stub";

export interface IUnprotectedActionEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorStub;
}

/**
 * The purpose of this endpoint class is to provide integration tests with a
 * way to verify if the checks in place for unprotected endpints are working
 * as intended.
 */
export class UnprotectedActionEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "UnprotectedActionEndpoint";
  public static readonly OAUTH2_SCOPES = [];

  private readonly log: Logger;

  public get className(): string {
    return UnprotectedActionEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IUnprotectedActionEndpointOptions) {
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
        operationId: "runTransactionV1",
        "x-hyperledger-cactus": {
          http: {
            path:
              "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-stub/unprotected-action",
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
        isProtected: false,
        requiredRoles: UnprotectedActionEndpoint.OAUTH2_SCOPES,
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
    const reqBody = req.body;
    try {
      const somethingPubliclyKnown = "2+2=4";
      const data = { reqBody, somethingPublic: somethingPubliclyKnown };
      res.json({ success: true, data });
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
