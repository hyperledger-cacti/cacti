import { Server } from "http";
import * as grpc from "grpc";
import { Server as SecureServer } from "https";
import { CommandService_v1Client as CommandService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
import { QueryService_v1Client as QueryService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
import commands from "iroha-helpers-ts/lib/commands/index";
import queries from "iroha-helpers-ts/lib/queries";
import type { Express } from "express";
import {
  GrantablePermission,
  GrantablePermissionMap,
} from "iroha-helpers-ts/lib/proto/primitive_pb";

import OAS from "../json/openapi.json";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Http405NotAllowedError,
} from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error";
import {
  IrohaCommand,
  IrohaQuery,
  RunTransactionRequestV1,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.iroha.keychain_not_found";

export interface IPluginLedgerConnectorIrohaOptions
  extends ICactusPluginOptions {
  rpcToriiPortHost: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorIroha
  implements
    IPluginLedgerConnector<
      never,
      never,
      RunTransactionRequestV1,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly pluginRegistry: PluginRegistry;

  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorIroha";

  public get className(): string {
    return PluginLedgerConnectorIroha.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorIrohaOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(
      options.rpcToriiPortHost,
      `${fnTag} options.rpcToriiPortHost`,
    );
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.prometheusExporter.startMetricsCollection();
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  deployContract(): Promise<never> {
    throw new RuntimeError("Method not implemented.");
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-iroha`;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  public async transact(
    req: RunTransactionRequestV1,
  ): Promise<RunTransactionResponse> {
    const { baseConfig } = req;
    if (
      !baseConfig ||
      !baseConfig.privKey ||
      !baseConfig.creatorAccountId ||
      !baseConfig.irohaHost ||
      !baseConfig.irohaPort ||
      !baseConfig.quorum ||
      !baseConfig.timeoutLimit
    ) {
      this.log.debug(
        "Certain field within the Iroha basic configuration is missing!",
      );
      throw new RuntimeError("Some fields in baseConfig is undefined");
    }
    const irohaHostPort = `${baseConfig.irohaHost}:${baseConfig.irohaPort}`;

    let grpcCredentials;
    if (baseConfig.tls) {
      throw new RuntimeError("TLS option is not supported");
    } else {
      grpcCredentials = grpc.credentials.createInsecure();
    }
    const commandService = new CommandService(
      irohaHostPort,
      //TODO:do something in the production environment
      grpcCredentials,
    );
    const queryService = new QueryService(irohaHostPort, grpcCredentials);
    const commandOptions = {
      privateKeys: baseConfig.privKey, //need an array of keys for command
      creatorAccountId: baseConfig.creatorAccountId,
      quorum: baseConfig.quorum,
      commandService: commandService,
      timeoutLimit: baseConfig.timeoutLimit,
    };
    const queryOptions = {
      privateKey: baseConfig.privKey[0], //only need 1 key for query
      creatorAccountId: baseConfig.creatorAccountId as string,
      queryService: queryService,
      timeoutLimit: baseConfig.timeoutLimit,
    };

    switch (req.commandName) {
      case IrohaCommand.CreateAccount: {
        try {
          const response = await commands.createAccount(commandOptions, {
            accountName: req.params[0],
            domainId: req.params[1],
            publicKey: req.params[2],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.SetAccountDetail: {
        try {
          const response = await commands.setAccountDetail(commandOptions, {
            accountId: req.params[0],
            key: req.params[1],
            value: req.params[2],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.CompareAndSetAccountDetail: {
        try {
          const response = await commands.compareAndSetAccountDetail(
            commandOptions,
            {
              accountId: req.params[0],
              key: req.params[1],
              value: req.params[2],
              oldValue: req.params[3],
            },
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.CreateAsset: {
        try {
          const response = await commands // (coolcoin#test; precision:3)
            .createAsset(commandOptions, {
              assetName: req.params[0],
              domainId: req.params[1],
              precision: req.params[2],
            });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.CreateDomain: {
        try {
          const response = await commands.createDomain(commandOptions, {
            domainId: req.params[0],
            defaultRole: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.SetAccountQuorum: {
        try {
          const response = await commands.setAccountQuorum(commandOptions, {
            accountId: req.params[0],
            quorum: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.AddAssetQuantity: {
        try {
          const response = await commands.addAssetQuantity(commandOptions, {
            assetId: req.params[0],
            amount: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.SubtractAssetQuantity: {
        try {
          const response = await commands.subtractAssetQuantity(
            commandOptions,
            {
              assetId: req.params[0],
              amount: req.params[1],
            },
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.TransferAsset: {
        try {
          const response = await commands.transferAsset(commandOptions, {
            srcAccountId: req.params[0],
            destAccountId: req.params[1],
            assetId: req.params[2],
            description: req.params[3],
            amount: req.params[4],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetSignatories: {
        try {
          const queryRes = await queries.getSignatories(queryOptions, {
            accountId: req.params[0],
          });
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetAccount: {
        try {
          const queryRes = await queries.getAccount(queryOptions, {
            accountId: req.params[0],
          });
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetAccountDetail: {
        try {
          const queryRes = await queries.getAccountDetail(queryOptions, {
            accountId: req.params[0],
            key: req.params[1],
            writer: req.params[2],
            pageSize: req.params[3],
            paginationKey: req.params[4],
            paginationWriter: req.params[5],
          });
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetAssetInfo: {
        try {
          const queryRes = await queries.getAssetInfo(queryOptions, {
            assetId: req.params[0],
          });
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetAccountAssets: {
        try {
          const queryRes = await queries.getAccountAssets(queryOptions, {
            accountId: req.params[0],
            pageSize: req.params[1],
            firstAssetId: req.params[2],
          });
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.AddSignatory: {
        try {
          const response = await commands.addSignatory(commandOptions, {
            accountId: req.params[0],
            publicKey: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.RemoveSignatory: {
        try {
          const response = await commands.removeSignatory(commandOptions, {
            accountId: req.params[0],
            publicKey: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetRoles: {
        try {
          const response = await queries.getRoles(queryOptions);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.CreateRole: {
        try {
          const response = await commands.createRole(commandOptions, {
            roleName: req.params[0],
            permissionsList: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.AppendRole: {
        try {
          const response = await commands.appendRole(commandOptions, {
            accountId: req.params[0],
            roleName: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.DetachRole: {
        try {
          const response = await commands.detachRole(commandOptions, {
            accountId: req.params[0],
            roleName: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetRolePermissions: {
        try {
          const response = await queries.getRolePermissions(queryOptions, {
            roleId: req.params[0],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.GrantPermission: {
        try {
          type permission = keyof GrantablePermissionMap;
          const response = await commands.grantPermission(commandOptions, {
            accountId: req.params[0],
            permission: GrantablePermission[req.params[1] as permission],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.RevokePermission: {
        try {
          type permission = keyof GrantablePermissionMap;
          const response = await commands.revokePermission(commandOptions, {
            accountId: req.params[0],
            permission: GrantablePermission[req.params[1] as permission],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.SetSettingValue: {
        throw new Http405NotAllowedError("SetSettingValue is not supported.");
      }
      case IrohaQuery.GetTransactions: {
        try {
          const response = await queries.getTransactions(queryOptions, {
            txHashesList: req.params[0],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetPendingTransactions: {
        try {
          const response = await queries.getPendingTransactions(queryOptions, {
            pageSize: req.params[0],
            firstTxHash: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetAccountTransactions: {
        try {
          const response = await queries.getAccountTransactions(queryOptions, {
            accountId: req.params[0],
            pageSize: req.params[1],
            firstTxHash: req.params[2],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetAccountAssetTransactions: {
        try {
          const response = await queries.getAccountAssetTransactions(
            queryOptions,
            {
              accountId: req.params[0],
              assetId: req.params[1],
              pageSize: req.params[2],
              firstTxHash: req.params[3],
            },
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetBlock: {
        try {
          const response = await queries.getBlock(queryOptions, {
            height: req.params[0],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.CallEngine: {
        try {
          const response = await commands.callEngine(commandOptions, {
            type: req.params[0],
            caller: req.params[1],
            callee: req.params[2],
            input: req.params[3],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetEngineReceipts: {
        try {
          const response = await queries.getEngineReceipts(queryOptions, {
            txHash: req.params[0],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.FetchCommits: {
        try {
          const response = await queries.fetchCommits(queryOptions);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.AddPeer: {
        try {
          const response = await commands.addPeer(commandOptions, {
            address: req.params[0],
            peerKey: req.params[1],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaCommand.RemovePeer: {
        try {
          const response = await commands.removePeer(commandOptions, {
            publicKey: req.params[0],
          });
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      case IrohaQuery.GetPeers: {
        try {
          const response = await queries.getPeers(queryOptions);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err);
        }
      }
      default: {
        throw new RuntimeError(
          "command or query does not exist, or is not supported in current version",
        );
      }
    }
  }
}
