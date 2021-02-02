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

export interface IGetSingleStatusEndpointOptions {
  logLevel?: LogLevelDesc;
}
export class GetSingleStatusEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetSingleStatusEndpoint";
  private readonly log: Logger;
  public get className() {
    return GetSingleStatusEndpoint.CLASS_NAME;
  }
  private client: Client;
  constructor(public readonly options: IGetSingleStatusEndpointOptions) {
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
    return "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/getSingleStatus/:id";
  }
  public registerExpress(expressApp: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetSingleStatusEndpoint#handleRequest()";
    this.log.debug(`GET ${this.getPath()}`);

    const id = req.params.id;

    this.log.info("Getting ID");
    this.log.info("ID: " + id);

    try {
      const result = await this.client.sendCall(
        "getSingleStatus",
        [id],
        "HashTimeLock",
        "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
      );
      this.log.info("RESULT: " + result);
      res.send(result);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
