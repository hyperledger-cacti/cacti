import { Express, Request, Response } from "express";
import HttpStatus from "http-status-codes";

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

import { RunTransactionEndpoint as Constants } from "./run-transaction-endpoint-constants";

export interface IRunTransactionEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorPolkadot;
}

export class RunTransactionEndpoint implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly opts: IRunTransactionEndpointOptions) {
    const fnTag = "RunTransactionEndpointV1#constructor()";

    Checks.truthy(opts, `${fnTag} options`);
    Checks.truthy(opts.connector, `${fnTag} options.connector`);

    this.log = LoggerProvider.getOrCreate({
      label: "run-transaction-endpoint-v1",
      level: opts.logLevel || "INFO",
    });
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
      // const reqBody = req.body as RunTransactionRequest;
      // const resBody = await this.opts.connector.transact(reqBody);
      // res.status(200);
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
