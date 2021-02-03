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

export interface IGetStatusEndpointOptions {
  logLevel?: LogLevelDesc;
}
export class GetStatusEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetStatusEndpoint";
  private readonly log: Logger;
  public get className(): string {
    return GetStatusEndpoint.CLASS_NAME;
  }
  private client: Client;
  constructor(public readonly options: IGetStatusEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.client = new Client();
  }
  public getVerbLowerCase(): string {
    return "get";
  }
  public getPath(): string {
    return "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/getStatus";
  }
  public registerExpress(expressApp: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetStatusEndpoint#handleRequest()";
    this.log.debug(`GET ${this.getPath()}`);
    try {
      await this.client.loadContracts(environment.CONTRACT_PATH);
      const query = req.query["ids"]?.toString();
      const ids = query?.split(",");
      const result = await this.client.sendCall(
        "getStatus",
        [ids],
        "HashTimeLock",
        environment.ACCOUNT_ADDRESS,
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
