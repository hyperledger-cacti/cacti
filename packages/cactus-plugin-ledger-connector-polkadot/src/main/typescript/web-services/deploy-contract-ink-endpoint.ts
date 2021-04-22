import { Express, Request, Response } from "express";
import HttpStatus from "http-status-codes";

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

import { DeployContractInkEndpoint as Constants } from "./deploy-contract-ink-endpoint-constants";
import { PluginLedgerConnectorPolkadot } from "../plugin-ledger-connector-polkadot";

export interface IDeployContractInkOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorPolkadot;
}

export class DeployContractInkEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployContractInkEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return DeployContractInkEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IDeployContractInkOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.connector, `${fnTag} arg options.connector`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
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

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "DeployContractInkEndpoint#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      const message =
        `${this.opts.connector.className} does not support ` +
        ` contract deployment yet. This is a feature that is under ` +
        ` development for now. Stay tuned!`;
      const resBody = { message };
      // const { connector } = this.opts;
      // const reqBody = req.body as DeployContractGoSourceV1Request;
      // const resBody = await connector.deployContract(reqBody);
      res.status(HttpStatus.NOT_IMPLEMENTED);
      res.json(resBody);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
