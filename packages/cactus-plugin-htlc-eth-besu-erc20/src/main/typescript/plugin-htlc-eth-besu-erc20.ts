import { Server } from "http";
import { Server as SecureServer } from "https";

import { Express } from "express";
import { Optional } from "typescript-optional";

import {
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
  IWebServiceEndpoint,
  PluginAspect,
} from "@hyperledger/cactus-core-api";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  PluginLedgerConnectorBesu,
  RunTransactionResponse,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { GetSingleStatusEndpoint } from "./web-services/get-single-status-endpoint";
import { GetStatusEndpoint } from "./web-services/get-status-endpoint";
import { NewContractEndpoint } from "./web-services/new-contract-endpoint";
import { RefundEndpoint } from "./web-services/refund-endpoint";
import { WithdrawEndpoint } from "./web-services/withdraw-endpoint";
import HashedTimeLockContractJSON from "../solidity/contracts/HashedTimeLockContract.json";

export interface IPluginHtlcEthBesuErc20Options extends ICactusPluginOptions {
  instanceId: string;
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorBesu;
}
export class PluginHtlcEthBesuErc20
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginHtlcEthBesuErc20";
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly connector: PluginLedgerConnectorBesu;

  constructor(public readonly opts: IPluginHtlcEthBesuErc20Options) {
    const fnTag = `${this.className}#constructor()`;
    const level = opts.logLevel || "INFO";
    Checks.truthy(opts, `${fnTag} opts`);
    Checks.truthy(opts.instanceId, `${fnTag} opts.instanceId`);
    Checks.truthy(opts.connector, `${fnTag} opts.pluginRegistry`);
    Checks.nonBlankString(opts.instanceId, `${fnTag} opts.instanceId`);
    this.log = LoggerProvider.getOrCreate({ level, label: this.className });
    this.instanceId = opts.instanceId;
    this.connector = opts.connector;
  }

  public get className(): string {
    return PluginHtlcEthBesuErc20.CLASS_NAME;
  }

  /**
   * Feature is deprecated, we won't need this method in the future.
   */
  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  /**
   * Feature is deprecated, we won't need this method in the future.
   */
  public async shutdown(): Promise<void> {
    return;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
  }

  public getAspect(): PluginAspect {
    return PluginAspect.SWAP;
  }

  public async installWebServices(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new GetSingleStatusEndpoint({
        logLevel: this.opts.logLevel,
        connector: this.connector,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetStatusEndpoint({
        logLevel: this.opts.logLevel,
        connector: this.connector,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    {
      const endpoint = new NewContractEndpoint({
        logLevel: this.opts.logLevel,
        connector: this.connector,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RefundEndpoint({
        logLevel: this.opts.logLevel,
        connector: this.connector,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    {
      const endpoint = new WithdrawEndpoint({
        logLevel: this.opts.logLevel,
        connector: this.connector,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }

    return endpoints;
  }

  public async initialize(
    account: string,
    privateKey: string,
    type: Web3SigningCredentialType,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#initialize()`;
    const hashedTimeLockResponse = await this.connector.deployContract({
      web3SigningCredential: {
        ethAccount: account,
        secret: privateKey,
        type: type,
      },
      bytecode: HashedTimeLockContractJSON.bytecode,
      gas: 6721975,
    });
    this.log.debug(
      `${fnTag} HashTimeLock Contract Response: ${JSON.stringify(
        hashedTimeLockResponse,
      )}`,
    );

    return hashedTimeLockResponse;
  }
}
