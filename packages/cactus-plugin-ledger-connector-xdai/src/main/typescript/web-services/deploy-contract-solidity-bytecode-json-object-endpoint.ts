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

import { PluginLedgerConnectorXdai } from "../plugin-ledger-connector-xdai";
import { DeployContractJsonObjectV1Request } from "../generated/openapi/typescript-axios";
import OAS from "../../json/openapi.json";

export interface IDeployContractSolidityBytecodeJsonObjectOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorXdai;
}

export class DeployContractSolidityBytecodeJsonObjectEndpoint
  implements IWebServiceEndpoint {
  public static readonly CLASS_NAME =
    "DeployContractSolidityBytecodeJsonObjectEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return DeployContractSolidityBytecodeJsonObjectEndpoint.CLASS_NAME;
  }

  constructor(
    public readonly options: IDeployContractSolidityBytecodeJsonObjectOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-xdai/deploy-contract-solidity-bytecode-json-object"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-xdai/deploy-contract-solidity-bytecode-json-object"
    ];
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.verbLowerCase;
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
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    const reqBody: DeployContractJsonObjectV1Request = req.body;
    try {
      const resBody = await this.options.connector.deployContractJsonObject(
        reqBody,
      );
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
