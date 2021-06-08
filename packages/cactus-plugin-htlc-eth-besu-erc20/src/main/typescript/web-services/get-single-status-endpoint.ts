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
import OAS from "../../json/openapi.json";
import { PluginHtlcEthBesuErc20 } from "../plugin-htlc-eth-besu-erc20";
import { Web3SigningCredential } from "../generated/openapi/typescript-axios";

export interface IGetSingleStatusEndpointOptions {
  logLevel?: LogLevelDesc;
  plugin: PluginHtlcEthBesuErc20;
}

export class GetSingleStatusEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetSingleStatusEndpoint";
  private readonly log: Logger;

  constructor(public readonly options: IGetSingleStatusEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    Checks.truthy(options, `${fnTag} arg options`);
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return GetSingleStatusEndpoint.CLASS_NAME;
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/get-single-status"
    ];
  }
  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cactus"].http.path;
  }

  public getOperationId(): string {
    return this.getOasPath().get.operationId;
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
    const fnTag = "GetSingleStatusEndpoint#handleRequest()";
    this.log.debug(`GET ${this.getPath()}`);
    try {
      const id = req.query["id"];
      const connectorId = req.query["connectorId"];
      const keychainId = req.query["keychainId"];
      const web3SigningCredential = req.query["web3SigningCredential"];

      const { callOutput } = await this.options.plugin.getSingleStatus(
        id as string,
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
