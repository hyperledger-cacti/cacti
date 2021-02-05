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
import {
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
  EthContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { NewContractRequest } from "../generated/openapi/typescript-axios";
import HashTimeLockJSON from "../../solidity/contracts/HashedTimeLockContract.json";
import { environment } from "../environment";

export interface INewContractEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorBesu;
}

export class NewContractEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "NewContractEndpoint";
  private readonly log: Logger;
  private readonly connector: PluginLedgerConnectorBesu;

  constructor(public readonly options: INewContractEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.connector = this.options.connector;
  }

  public get className(): string {
    return NewContractEndpoint.CLASS_NAME;
  }

  public getVerbLowerCase(): string {
    return "post";
  }
  public getPath(): string {
    return "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/new-contract";
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
      const request: NewContractRequest = req.body as NewContractRequest;
      const params = [
        request.inputAmount,
        request.outputAmount,
        request.expiration,
        request.hashLock,
        request.tokenAddress,
        request.receiver,
        request.outputNetwork,
        request.outputAddress,
      ];

      const result = await this.connector.invokeContract({
        contractAbi: HashTimeLockJSON.abi,
        contractAddress: environment.CONTRACT_ADDRESS,
        invocationType: EthContractInvocationType.SEND,
        methodName: "newContract",
        params,
        web3SigningCredential: {
          ethAccount: environment.ACCOUNT_ADDRESS,
          secret: environment.PRIVATE_KEY,
          type: Web3SigningCredentialType.PRIVATEKEYHEX,
        },
        gas: 6721975,
      });

      this.log.debug(`${fnTag} Result: ${result}`);
      res.send(result);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
    }
  }
}
