import { Express, Request, Response, NextFunction } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { DeployContractSolidityBytecodeEndpoint as Constants } from "./deploy-contract-solidity-bytecode-endpoint-constants";
import { PluginLedgerConnectorQuorum } from "../plugin-ledger-connector-quorum";
import { DeployContractSolidityBytecodeV1Request } from "../generated/openapi/typescript-axios";

export interface IDeployContractSolidityBytecodeOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorQuorum;
}

export class DeployContractSolidityBytecodeEndpoint
  implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployContractSolidityBytecodeEndpoint";

  private readonly log: Logger;

  public get className() {
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

  public getPath(): string {
    return Constants.HTTP_PATH;
  }

  public getVerbLowerCase(): string {
    return Constants.HTTP_VERB_LOWER_CASE;
  }

  public registerExpress(app: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(app, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    const reqBody: DeployContractSolidityBytecodeV1Request = req.body;
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
