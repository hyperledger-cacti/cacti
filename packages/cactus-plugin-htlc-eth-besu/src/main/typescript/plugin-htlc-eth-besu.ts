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

import { GetSingleStatusEndpoint } from "./web-services/getSingleStatus-endpoint";
import { GetStatusEndpoint } from "./web-services/getStatus-endpoint";
import { NewContractEndpoint } from "./web-services/newContract-endpoint";
import { RefundEndpoint } from "./web-services/refund-endpoint";
import { WithdrawEndpoint } from "./web-services/withdraw-endpoint";
import {
  PluginLedgerConnectorBesu,
  RunTransactionResponse,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import HashTimeLockJson from "../contracts/build/contracts/HashTimeLock.json";
export interface IPluginHtlcEthBesuOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  connector: PluginLedgerConnectorBesu;
}
export class PluginHtlcEthBesu implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginHtlcEthBesu";
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly connector: PluginLedgerConnectorBesu;
  //private readonly pluginRegistry: PluginRegistry;

  public get className(): string {
    return PluginHtlcEthBesu.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginHtlcEthBesuOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} opts`);
    Checks.truthy(opts.instanceId, `${fnTag} opts.instanceId`);
    Checks.truthy(opts.connector, `${fnTag} opts.pluginRegistry`);
    //Checks.truthy(opts.pluginRegistry, `${fnTag} opts.pluginRegistry`);
    Checks.nonBlankString(opts.instanceId, `${fnTag} opts.instanceId`);

    //this.pluginRegistry = opts.pluginRegistry;

    const level = opts.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label: this.className });
    this.instanceId = opts.instanceId;
    this.connector = opts.connector;
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
    return "@hyperledger/cactus-plugin-htlc-eth-besu";
  }

  public getAspect(): PluginAspect {
    //return PluginAspect.ATOMIC_SWAP;
    return PluginAspect.LEDGER_CONNECTOR;
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
      bytecode: HashTimeLockJson.bytecode,
      gas: 4100500,
    });
    this.log.info("DEPLOY END: " + hashedTimeLockResponse);
    this.log.debug(
      "ACCOUNT: " + hashedTimeLockResponse.transactionReceipt.contractAddress,
    );
    this.log.debug(
      `${fnTag} HashTimeLock Contract Response: ${JSON.stringify(
        hashedTimeLockResponse,
      )}`,
    );

    return hashedTimeLockResponse;
  }

  /*
  public async atomicSwapV1(req: any): Promise<any> {
    const fnTag = `${this.className}#atomicSwapV1()`;

    const { connectorInstanceId: instanceId } = req;

    const plugins = this.pluginRegistry.getPlugins();
    const plugin = plugins.find((p) => p.getInstanceId() === instanceId);

    /*    Checks.truthy(
      plugin instanceof PluginLedgerConnectorBesu,
      `${fnTag}:connector`,
    );

    const connector = plugin as PluginLedgerConnectorBesu;*/

  // could work something like this but I'm just throwing this here without
  // testing for now...
  /*   await connector.invokeContract({
      contractAbi: HashTimeLockJson.abi,
      contractAddress: req.contractAddress,
      invocationType: EthContractInvocationType.SEND,
      methodName: "newContract",
      params: ["... not sure"],
      web3SigningCredential: req.web3SigningCredential,
      gas: req.gas,
      gasPrice: req.gasPrice,
      timeoutMs: req.timeoutMs,
    });

    return;
  }
  */
}
