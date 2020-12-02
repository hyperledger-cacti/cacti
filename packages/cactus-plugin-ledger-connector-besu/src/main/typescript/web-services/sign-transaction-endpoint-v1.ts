import { Express, Request, Response } from "express";
import { Optional } from "typescript-optional";
import Web3 from "web3";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  JsObjectSigner,
  IJsObjectSignerOptions,
  KeyConverter,
  KeyFormat,
  Checks,
} from "@hyperledger/cactus-common";

import {
  SignTransactionRequest,
  SignTransactionResponse,
} from "../generated/openapi/typescript-axios/api";

import { BesuSignTransactionEndpointV1 as Constants } from "./sign-transaction-endpoint-constants";
import { PluginLedgerConnectorBesu } from "../plugin-ledger-connector-besu";

export interface IBesuSignTransactionEndpointOptions {
  connector: PluginLedgerConnectorBesu;
  logLevel?: LogLevelDesc;
}

export class BesuSignTransactionEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly options: IBesuSignTransactionEndpointOptions) {
    const fnTag = "BesuSignTransactionEndpointV1#constructor()";

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.connector, `${fnTag} options.connector`);

    const label = "besu-sign-transaction-endpoint";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return Constants.HTTP_PATH;
  }

  getVerbLowerCase(): string {
    return Constants.HTTP_VERB_LOWER_CASE;
  }

  registerExpress(app: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(app, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "BesuSignTransactionEndpointV1#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      const request: SignTransactionRequest = req.body as SignTransactionRequest;

      const trxResponse = await this.options.connector.signTransaction(request);

      if (trxResponse.isPresent()) {
        res.status(200);
        res.json(trxResponse.get());
      } else {
        this.log.error(`${fnTag} failed to find the transaction`);
        res.status(404);
        res.statusMessage = "Transaction not found";
        res.json({ error: "Transaction not found" });
      }
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
