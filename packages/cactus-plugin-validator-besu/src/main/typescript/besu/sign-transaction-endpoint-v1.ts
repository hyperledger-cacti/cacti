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
} from "@hyperledger/cactus-common";

import {
  SignTransactionRequest,
  SignTransactionResponse,
} from "../generated/openapi/typescript-axios/api";

import { BesuSignTransactionEndpointV1 as Constants } from "./sign-transaction-endpoint-constants";

export interface IBesuSignTransactionEndpointOptions {
  rpcApiHttpHost: string;
  keyPairPem: string;
  logLevel?: LogLevelDesc;
}

export class BesuSignTransactionEndpointV1 implements IWebServiceEndpoint {
  private readonly web3: Web3;
  private readonly jsObjectSigner: JsObjectSigner;
  private readonly log: Logger;

  constructor(public readonly options: IBesuSignTransactionEndpointOptions) {
    const fnTag = "BesuSignTransactionEndpointV1#constructor()";
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    if (!options.rpcApiHttpHost) {
      throw new Error(`${fnTag} options.rpcApiHttpHost falsy.`);
    }
    if (!options.keyPairPem) {
      throw new Error(`${fnTag} options.keyPairPem falsy.`);
    }

    const keyConverter = new KeyConverter();
    const convertRawPrivate = keyConverter.privateKeyAs(
      options.keyPairPem,
      KeyFormat.PEM,
      KeyFormat.Raw
    );
    const jsObjectSignerOptions: IJsObjectSignerOptions = {
      privateKey: convertRawPrivate,
      logLevel: options.logLevel || "INFO",
    };

    this.jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

    const web3Provider = new Web3.providers.HttpProvider(
      this.options.rpcApiHttpHost
    );
    this.web3 = new Web3(web3Provider);

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

      const trxResponse: Optional<SignTransactionResponse> = await this.processRequest(
        request
      );

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

  private async processRequest(
    request: SignTransactionRequest
  ): Promise<Optional<SignTransactionResponse>> {
    const transaction = await this.web3.eth.getTransaction(
      request.transactionHash
    );

    if (transaction !== undefined && transaction !== null) {
      const singData = this.jsObjectSigner.sign(transaction.input);
      const signDataHex = Buffer.from(singData).toString("hex");

      const resBody: SignTransactionResponse = { signature: signDataHex };
      return Optional.ofNullable(resBody);
    }

    return Optional.empty();
  }
}
