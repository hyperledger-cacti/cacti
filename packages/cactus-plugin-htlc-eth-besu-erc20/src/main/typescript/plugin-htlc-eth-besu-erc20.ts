import { Express } from "express";

import OAS from "../json/openapi.json";

import {
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { Checks, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  EthContractInvocationType,
  InvokeContractV1Response,
  PluginLedgerConnectorBesu,
  RunTransactionResponse,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { GetSingleStatusEndpoint } from "./web-services/get-single-status-endpoint";
import { GetStatusEndpoint } from "./web-services/get-status-endpoint";
import { NewContractEndpoint } from "./web-services/new-contract-endpoint";
import { RefundEndpoint } from "./web-services/refund-endpoint";
import { WithdrawEndpoint } from "./web-services/withdraw-endpoint";
import { InitializeEndpoint } from "./web-services/initialize-endpoint";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { NewContractRequest } from ".";
import HashTimeLockJSON from "../solidity/contracts/HashedTimeLockContract.json";
import {
  InitializeRequest,
  RefundRequest,
  WithdrawRequest,
  GetStatusRequest,
  GetSingleStatusRequest,
} from "./generated/openapi/typescript-axios";
import { Optional } from "typescript-optional";

export interface IPluginHtlcEthBesuErc20Options extends ICactusPluginOptions {
  keychainId?: string;
  instanceId: string;
  logLevel?: LogLevelDesc;
  pluginRegistry: PluginRegistry;
}
export class PluginHtlcEthBesuErc20
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginHtlcEthBesuErc20";
  private readonly instanceId: string;
  private readonly keychainId: Optional<string>;
  private readonly pluginRegistry: PluginRegistry;
  private readonly estimatedGas = 6721975;
  private endpoints: IWebServiceEndpoint[] | undefined;

  constructor(public readonly opts: IPluginHtlcEthBesuErc20Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} opts`);
    Checks.truthy(opts.instanceId, `${fnTag} opts.instanceId`);
    Checks.truthy(opts.pluginRegistry, `${fnTag} opts.pluginRegistry`);
    Checks.nonBlankString(opts.instanceId, `${fnTag} opts.instanceId`);
    this.instanceId = opts.instanceId;
    this.keychainId = opts.keychainId
      ? Optional.of(opts.keychainId)
      : Optional.empty();
    this.pluginRegistry = opts.pluginRegistry;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public get className(): string {
    return PluginHtlcEthBesuErc20.CLASS_NAME;
  }

  /**
   * Feature is deprecated, we won't need this method in the future.
   */
  public async shutdown(): Promise<void> {
    return;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): Optional<string> {
    return this.keychainId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(app));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new GetSingleStatusEndpoint({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetStatusEndpoint({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new NewContractEndpoint({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RefundEndpoint({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new WithdrawEndpoint({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new InitializeEndpoint({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;
    return endpoints;
  }

  public async initialize(
    initializeRequest: InitializeRequest,
  ): Promise<RunTransactionResponse> {
    const connector = this.pluginRegistry.plugins.find(
      (plugin) => plugin.getInstanceId() == initializeRequest.connectorId,
    ) as PluginLedgerConnectorBesu;

    const hashedTimeLockResponse = await connector.deployContract({
      contractName: HashTimeLockJSON.contractName,
      contractAbi: HashTimeLockJSON.abi,
      bytecode: HashTimeLockJSON.bytecode,
      web3SigningCredential: initializeRequest.web3SigningCredential,
      keychainId: initializeRequest.keychainId,
      constructorArgs: initializeRequest.constructorArgs,
      gas: initializeRequest.gas || this.estimatedGas,
    });
    return hashedTimeLockResponse;
  }

  public async newContract(
    newContractRequest: NewContractRequest,
  ): Promise<InvokeContractV1Response> {
    const params = [
      newContractRequest.inputAmount,
      newContractRequest.outputAmount,
      newContractRequest.expiration,
      newContractRequest.hashLock,
      newContractRequest.tokenAddress,
      newContractRequest.receiver,
      newContractRequest.outputNetwork,
      newContractRequest.outputAddress,
    ];

    const connector = this.pluginRegistry.plugins.find(
      (plugin) => plugin.getInstanceId() == newContractRequest.connectorId,
    ) as PluginLedgerConnectorBesu;

    const result = await connector.invokeContract({
      contractName: HashTimeLockJSON.contractName,
      keychainId: newContractRequest.keychainId,
      signingCredential: newContractRequest.web3SigningCredential,
      contractAddress: newContractRequest.contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "newContract",
      params,
      gas: newContractRequest.gas || this.estimatedGas,
    });

    return result;
  }

  public async refund(
    refundRequest: RefundRequest,
  ): Promise<InvokeContractV1Response> {
    const connector = this.pluginRegistry.plugins.find(
      (plugin) => plugin.getInstanceId() == refundRequest.connectorId,
    ) as PluginLedgerConnectorBesu;

    const result = await connector.invokeContract({
      contractName: HashTimeLockJSON.contractName,
      keychainId: refundRequest.keychainId,
      signingCredential: refundRequest.web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "refund",
      params: [refundRequest.id],
      gas: refundRequest.gas || this.estimatedGas,
    });

    return result;
  }

  public async withdraw(
    withdrawRequest: WithdrawRequest,
  ): Promise<InvokeContractV1Response> {
    const connector = this.pluginRegistry.plugins.find(
      (plugin) => plugin.getInstanceId() == withdrawRequest.connectorId,
    ) as PluginLedgerConnectorBesu;
    const params = [withdrawRequest.id, withdrawRequest.secret];
    const result = await connector.invokeContract({
      contractName: HashTimeLockJSON.contractName,
      keychainId: withdrawRequest.keychainId,
      signingCredential: withdrawRequest.web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "withdraw",
      params,
      gas: withdrawRequest.gas || this.estimatedGas,
    });

    return result;
  }

  public async getSingleStatus(
    req: GetSingleStatusRequest,
  ): Promise<InvokeContractV1Response> {
    const connector = this.pluginRegistry.plugins.find(
      (plugin) => plugin.getInstanceId() == req.connectorId,
    ) as PluginLedgerConnectorBesu;

    const result = await connector.invokeContract({
      contractName: HashTimeLockJSON.contractName,
      signingCredential: req.web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getSingleStatus",
      params: [req.id],
      keychainId: req.keychainId,
    });
    return result;
  }

  public async getStatus(
    req: GetStatusRequest,
  ): Promise<InvokeContractV1Response> {
    const connector = this.pluginRegistry.plugins.find(
      (plugin) => plugin.getInstanceId() == req.connectorId,
    ) as PluginLedgerConnectorBesu;

    const result = await connector.invokeContract({
      contractName: HashTimeLockJSON.contractName,
      signingCredential: req.web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getStatus",
      params: [req.ids],
      keychainId: req.keychainId,
    });
    return result;
  }
}
