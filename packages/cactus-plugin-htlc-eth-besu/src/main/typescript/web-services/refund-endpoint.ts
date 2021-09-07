import { Express, Request, Response } from "express";
import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  IExpressRequestHandler,
  IWebServiceEndpoint,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { PluginHtlcEthBesu } from "../plugin-htlc-eth-besu";
import { RefundReq } from "../generated/openapi/typescript-axios";
import OAS from "../../json/openapi.json";

export interface IRefundEndpointOptions {
  logLevel?: LogLevelDesc;
  plugin: PluginHtlcEthBesu;
}
export class RefundEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "RefundEndpoint";
  private readonly log: Logger;

  constructor(public readonly options: IRefundEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return RefundEndpoint.CLASS_NAME;
  }

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/refund"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/refund"
    ];
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.path;
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
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
    const fnTag = "RefundEndpoint#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);
    try {
      const request: RefundReq = req.body as RefundReq;
      const result = await this.options.plugin.refund(request);
      this.log.debug(`${fnTag} Result: ${result}`);
      if (result.transactionReceipt?.status === false) {
        res.status(400).json({
          message: "Bad request",
          error: result.transactionReceipt,
        });
      } else {
        res.send(result);
      }
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
