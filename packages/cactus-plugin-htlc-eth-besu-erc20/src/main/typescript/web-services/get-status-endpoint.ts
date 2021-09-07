import { Express, Request, Response } from "express";
import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { Web3SigningCredential } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import OAS from "../../json/openapi.json";
import { PluginHtlcEthBesuErc20 } from "../plugin-htlc-eth-besu-erc20";

export interface IGetStatusEndpointOptions {
  logLevel?: LogLevelDesc;
  plugin: PluginHtlcEthBesuErc20;
}

export class GetStatusEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetStatusEndpoint";
  private readonly log: Logger;

  constructor(public readonly options: IGetStatusEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    Checks.truthy(options, `${fnTag} arg options`);
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return GetStatusEndpoint.CLASS_NAME;
  }

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/get-status"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/get-status"
    ];
  }

  public getVerbLowerCase(): string {
    return this.oasPath.get["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    return this.oasPath.get["x-hyperledger-cactus"].http.path;
  }

  public getOperationId(): string {
    return this.oasPath.get.operationId;
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
    const fnTag = "GetStatusEndpoint#handleRequest()";
    this.log.debug(`GET ${this.getPath()}`);
    try {
      const query = req.query["ids"]?.toString();
      const ids = query?.split(",");
      const connectorId = req.query["connectorId"];
      const keychainId = req.query["keychainId"];
      const web3SigningCredential = req.query["web3SigningCredential"];

      const { callOutput } = await this.options.plugin.getStatus(
        ids as string[],
        connectorId as string,
        keychainId as string,
        (web3SigningCredential as unknown) as Web3SigningCredential,
      );

      res.send(callOutput);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(400).json({
        message: "Bad request",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
