import { Express, Request, Response } from "express";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import Client from "../client";
import {
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { environment } from "../environment";
export interface INewContractEndpointOptions {
  logLevel?: LogLevelDesc;
}
import { NewContractObj } from "../generated/openapi/typescript-axios/api";
export class NewContractEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "NewContractEndpoint";
  private readonly log: Logger;
  public get className() {
    return NewContractEndpoint.CLASS_NAME;
  }
  private client: Client;
  constructor(public readonly options: INewContractEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.client = new Client();
  }
  public getVerbLowerCase(): string {
    return "post";
  }
  public getPath(): string {
    return "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/newContract";
  }
  public registerExpress(expressApp: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "NewContractEndpoint#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);
    try {
      await this.client.loadContracts(environment.CONTRACT_PATH!);
      const request: NewContractObj = req.body as NewContractObj;
      const outputAmount = request.outputAmount;
      const expiration = request.expiration;
      const hashLock = request.hashLock;
      const receiver = request.receiver;
      const outputNetwork = request.outputNetwork;
      const outputAddress = request.outputAddress;
      const result = await this.client.sendTx(
        "newContract",
        [
          outputAmount,
          expiration,
          hashLock,
          receiver,
          outputNetwork,
          outputAddress,
        ],
        environment.CONTRACT_NAME,
        environment.CONTRACT_ADDRESS,
        environment.ACCOUNT_ADDRESS,
        environment.PRIVATE_KEY,
        "100",
      );
      this.log.debug(`${fnTag} Result: ${result}`);
      res.send(result);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
