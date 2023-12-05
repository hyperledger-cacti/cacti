import type { Express, Request, Response } from "express";

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
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import { PluginLedgerConnectorBesu } from "../plugin-ledger-connector-besu";
import { DeployContractSolidityBytecodeV1Request } from "../generated/openapi/typescript-axios";
import OAS from "../../json/openapi.json";

export interface IDeployContractSolidityBytecodeOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorBesu;
}

export class DeployContractSolidityBytecodeEndpoint
  implements IWebServiceEndpoint
{
  public static readonly CLASS_NAME = "DeployContractSolidityBytecodeEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return DeployContractSolidityBytecodeEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IDeployContractSolidityBytecodeOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/deploy-contract-solidity-bytecode"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/deploy-contract-solidity-bytecode"
    ];
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.verbLowerCase;
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
    const { log } = this;
    const fnTag = `${this.className}#handleRequest()`;
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    const reqBody: DeployContractSolidityBytecodeV1Request = req.body;
    try {
      const resBody = await this.options.connector.deployContract(reqBody);
      res.json(resBody);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} Failed to deploy contract:`;
      await handleRestEndpointException({ errorMsg, log, error: ex, res });
    }
  }
}
