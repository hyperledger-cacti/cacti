import { Express, Request, Response } from "express";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
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
export interface INewContractEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorBesu;
}
import { NewContractObj } from "../generated/openapi/typescript-axios/api";
export class NewContractEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "NewContractEndpoint";
  private readonly log: Logger;
  private readonly connector: PluginLedgerConnectorBesu;

  public get className() {
    return NewContractEndpoint.CLASS_NAME;
  }
  constructor(public readonly options: INewContractEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.connector = this.options.connector;
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
      const request: NewContractObj = req.body as NewContractObj;
      const params = [
        request.outputAmount,
        request.expiration,
        request.hashLock,
        request.receiver,
        request.outputNetwork,
        request.outputAddress,
      ];
      const result = await this.connector.invokeContract({
        contractAbi: HashTimeLockJson.abi,
        contractAddress: environment.CONTRACT_ADDRESS,
        invocationType: EthContractInvocationType.SEND,
        methodName: "newContract",
        params,
        web3SigningCredential: {
          ethAccount: environment.ACCOUNT_ADDRESS,
          type: Web3SigningCredentialType.PRIVATEKEYHEX,
          secret: environment.PRIVATE_KEY,
        },
        gas: 40000000,
        value: 100,
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
