import { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { PluginLedgerConnectorPolkadot } from "../plugin-ledger-connector-polkadot";
import { InvokeContractEndpoint as Constants } from "./invoke-contract-endpoint-constants";
import HttpStatus from "http-status-codes";

export interface IInvokeContractEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorPolkadot;
}

export class InvokeContractEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "InvokeContractEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return InvokeContractEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IInvokeContractEndpointOptions) {
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

  registerExpress(webApp: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(webApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "InvokeContractInkEndpoint#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      // const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
      // this.log.debug(reqTag);
      // const reqBody = req.body;
      const message =
        `${this.options.connector.className} does not support ` +
        ` invocation of contracts yet. This is a feature that is under ` +
        ` development for now. Stay tuned!`;
      const resBody = { message };
      // const resBody = await this.options.connector.invokeContract(reqBody);
      // res.json(resBody);
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
