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
    await this.client.loadContracts(environment.CONTRACT_PATH!);
    //TODO: check that it recovers the BODY correctly.
    const request: NewContractObj = req.body as NewContractObj;
    const outputAmount = request.outputAmount;
    const expiration = request.expiration;
    const hashLock = request.hashLock;
    const receiver = request.receiver;
    const outputNetwork = request.outputNetwork;
    const outputAddress = request.outputAddress;
    try {
      //TODO: check that it works and remove from here.
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
        "HashTimeLock",
        "0xCfEB869F69431e42cdB54A4F4f105C19C080A601",
        "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
        "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
        "1111",
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
