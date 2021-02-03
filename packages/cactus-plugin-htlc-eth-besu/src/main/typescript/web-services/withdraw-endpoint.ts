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

export interface IWithdrawEndpointOptions {
  logLevel?: LogLevelDesc;
}
export class WithdrawEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "WithdrawEndpoint";
  private readonly log: Logger;
  public get className(): string {
    return WithdrawEndpoint.CLASS_NAME;
  }
  private client: Client;
  constructor(public readonly options: IWithdrawEndpointOptions) {
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
    return "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/Withdraw/:id/:secret";
  }
  public registerExpress(expressApp: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "WithdrawEndpoint#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);
    try {
      const id = req.params["id"];
      const secret = req.params["secret"];
      await this.client.loadContracts(environment.CONTRACT_PATH);
      const result = await this.client.sendTx(
        "withdraw",
        [id, secret],
        environment.CONTRACT_NAME,
        environment.CONTRACT_ADDRESS,
        environment.ACCOUNT_ADDRESS,
        environment.PRIVATE_KEY,
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
