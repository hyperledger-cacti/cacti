import { Express, Request, Response } from "express";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
//import Client from "../client";
import {
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { environment } from "../environment";
import {
  EthContractInvocationType,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import HashTimeLockJson from "../../contracts/build/contracts/HashTimeLock.json";
export interface IGetStatusEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorBesu;
}
export class GetStatusEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetStatusEndpoint";
  private readonly log: Logger;
  private readonly connector: PluginLedgerConnectorBesu;

  public get className(): string {
    return GetStatusEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IGetStatusEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.connector = this.options.connector;
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
      const query = req.query["ids"]?.toString();
      const ids = query?.split(",");

      const result = await this.connector.invokeContract({
        contractAbi: HashTimeLockJson.abi,
        contractAddress: environment.CONTRACT_ADDRESS,
        invocationType: EthContractInvocationType.CALL,
        methodName: "getStatus",
        params: [ids],
        web3SigningCredential: {
          ethAccount: environment.ACCOUNT_ADDRESS,
          type: Web3SigningCredentialType.PRIVATEKEYHEX,
          secret: environment.PRIVATE_KEY,
        },
      });
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
