import * as grpc from "grpc";
import { CommandService_v1Client as CommandService } from "iroha-helpers/lib/proto/endpoint_grpc_pb";
import { QueryService_v1Client as QueryService } from "iroha-helpers/lib/proto/endpoint_grpc_pb";
import { Transaction } from "iroha-helpers/lib/proto/transaction_pb";
import commands from "iroha-helpers/lib/commands/index";
import queries from "iroha-helpers/lib/queries";
import { TxBuilder } from "iroha-helpers/lib/chain";
import type { Express } from "express";
import {
  GrantablePermission,
  GrantablePermissionMap,
} from "iroha-helpers/lib/proto/primitive_pb";

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
  RunTransactionSignedRequestV1,
  GenerateTransactionRequestV1,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { GenerateTransactionEndpoint } from "./web-services/generate-transaction-endpoint";
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
      RunTransactionSignedRequestV1 | RunTransactionRequestV1,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;

  private endpoints: IWebServiceEndpoint[] | undefined;

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
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
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
    {
      const endpoint = new GenerateTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
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

  /**
   * Create and run Iroha transaction based on input arguments.
   * Transaction is signed with a private key supplied in the input argument.
   *
   * @param req `RunTransactionSignedRequestV1`
   * @param commandService Iroha SDK `CommandService_v1Client` instance
   * @param queryService Iroha SDK `QueryService_v1Client` instance
   * @returns `Promise<RunTransactionResponse>`
   */
  private async transactRequest(
    req: RunTransactionRequestV1,
    commandService: CommandService,
    queryService: QueryService,
  ): Promise<RunTransactionResponse> {
    const { baseConfig } = req;
    if (
      !baseConfig ||
      !baseConfig.privKey ||
      !baseConfig.creatorAccountId ||
      !baseConfig.quorum ||
      !baseConfig.timeoutLimit
    ) {
      throw new RuntimeError("Some fields in baseConfig is undefined");
    }

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
      case IrohaCommand.AddAssetQuantity: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              assetId: req.params[0],
              amount: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.addAssetQuantity(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.AddPeer: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              address: req.params[0],
              peerKey: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.addPeer(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.AddSignatory: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              publicKey: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.addSignatory(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.AppendRole: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              roleName: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.appendRole(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.CallEngine: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              type: req.params[0],
              caller: req.params[1],
              callee: req.params[2],
              input: req.params[3],
            };
          } else {
            params = req.params;
          }
          const response = await commands.callEngine(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.CreateAccount: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountName: req.params[0],
              domainId: req.params[1],
              publicKey: req.params[2],
            };
          } else {
            params = req.params;
          }
          const response = await commands.createAccount(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.CreateAsset: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              assetName: req.params[0],
              domainId: req.params[1],
              precision: req.params[2],
            };
          } else {
            params = req.params;
          }
          const response = await commands.createAsset(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.CreateDomain: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              domainId: req.params[0],
              defaultRole: req.params[1],
            };
            params.domainId = req.params[0];
            params.defaultRole = req.params[1];
          } else {
            params = req.params;
          }
          const response = await commands.createDomain(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.CreateRole: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              roleName: req.params[0],
              permissionsList: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.createRole(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.DetachRole: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              roleName: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.detachRole(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.GrantPermission: {
        try {
          let params;
          type permission = keyof GrantablePermissionMap;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              permission: GrantablePermission[req.params[1] as permission],
            };
          } else {
            params = req.params;
            if ("permission" in params) {
              params["permission"] =
                GrantablePermission[params["permission"] as permission];
            }
          }
          const response = await commands.grantPermission(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.RemovePeer: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              publicKey: req.params[0],
            };
          } else {
            params = req.params;
          }
          const response = await commands.removePeer(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.RemoveSignatory: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              publicKey: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.removeSignatory(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.RevokePermission: {
        try {
          let params;
          type permission = keyof GrantablePermissionMap;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              permission: GrantablePermission[req.params[1] as permission],
            };
          } else {
            params = req.params;
            if ("permission" in params) {
              params["permission"] =
                GrantablePermission[params["permission"] as permission];
            }
          }
          const response = await commands.revokePermission(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.SetAccountDetail: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              key: req.params[1],
              value: req.params[2],
            };
          } else {
            params = req.params;
          }
          const response = await commands.setAccountDetail(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.SetAccountQuorum: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              quorum: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.setAccountQuorum(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.SubtractAssetQuantity: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              assetId: req.params[0],
              amount: req.params[1],
            };
          } else {
            params = req.params;
          }
          const response = await commands.subtractAssetQuantity(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.TransferAsset: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              srcAccountId: req.params[0],
              destAccountId: req.params[1],
              assetId: req.params[2],
              description: req.params[3],
              amount: req.params[4],
            };
          } else {
            params = req.params;
          }
          const response = await commands.transferAsset(commandOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.CompareAndSetAccountDetail: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              key: req.params[1],
              value: req.params[2],
              oldValue: req.params[3],
              checkEmpty: req.params[4],
            };
          } else {
            params = req.params;
          }
          const response = await commands.compareAndSetAccountDetail(
            commandOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaCommand.SetSettingValue: {
        throw new Http405NotAllowedError("SetSettingValue is not supported.");
      }
      case IrohaQuery.GetEngineReceipts: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              txHash: req.params[0],
            };
          } else {
            params = req.params;
          }
          const response = await queries.getEngineReceipts(
            queryOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetAccount: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
            };
          } else {
            params = req.params;
          }
          const queryRes = await queries.getAccount(queryOptions, params);
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetBlock: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              height: req.params[0],
            };
          } else {
            params = req.params;
          }
          const response = await queries.getBlock(queryOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetSignatories: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
            };
          } else {
            params = req.params;
          }
          const queryRes = await queries.getSignatories(queryOptions, params);
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetTransactions: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              txHashesList: req.params[0],
            };
          } else {
            params = req.params;
          }
          const response = await queries.getTransactions(queryOptions, params);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetPendingTransactions: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              pageSize: req.params[0],
              firstTxHash: req.params[1],
              firstTxTime: req.params[2],
              lastTxTime: req.params[3],
              firstTxHeight: req.params[4],
              lastTxHeight: req.params[5],
              ordering: {
                field: req.params[6],
                direction: req.params[7],
              },
            };
          } else {
            params = req.params;
          }
          const response = await queries.getPendingTransactions(
            queryOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetAccountTransactions: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              pageSize: req.params[1],
              firstTxHash: req.params[2],
              firstTxTime: req.params[3],
              lastTxTime: req.params[4],
              firstTxHeight: req.params[5],
              lastTxHeight: req.params[6],
              ordering: {
                field: req.params[7],
                direction: req.params[8],
              },
            };
          } else {
            params = req.params;
          }
          const response = await queries.getAccountTransactions(
            queryOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetAccountAssetTransactions: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              assetId: req.params[1],
              pageSize: req.params[2],
              firstTxHash: req.params[3],
              firstTxTime: req.params[4],
              lastTxTime: req.params[5],
              firstTxHeight: req.params[6],
              lastTxHeight: req.params[7],
              ordering: {
                field: req.params[8],
                direction: req.params[9],
              },
            };
          } else {
            params = req.params;
          }
          const response = await queries.getAccountAssetTransactions(
            queryOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetAccountAssets: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              pageSize: req.params[1],
              firstAssetId: req.params[2],
            };
          } else {
            params = req.params;
          }
          const queryRes = await queries.getAccountAssets(queryOptions, params);
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetAccountDetail: {
        try {
          let params: any;
          if (Array.isArray(req.params)) {
            params = {
              accountId: req.params[0],
              key: req.params[1],
              writer: req.params[2],
              pageSize: req.params[3],
              paginationKey: req.params[4],
              paginationWriter: req.params[5],
            };
          } else {
            params = req.params;
          }
          const queryRes = await queries.getAccountDetail(queryOptions, params);
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetAssetInfo: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              assetId: req.params[0],
            };
          } else {
            params = req.params;
          }
          const queryRes = await queries.getAssetInfo(queryOptions, params);
          return { transactionReceipt: queryRes };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetRoles: {
        try {
          const response = await queries.getRoles(queryOptions);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetRolePermissions: {
        try {
          let params;
          if (Array.isArray(req.params)) {
            params = {
              roleId: req.params[0],
            };
          } else {
            params = req.params;
          }
          const response = await queries.getRolePermissions(
            queryOptions,
            params,
          );
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.GetPeers: {
        try {
          const response = await queries.getPeers(queryOptions);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      case IrohaQuery.FetchCommits: {
        try {
          const response = await queries.fetchCommits(queryOptions);
          return { transactionReceipt: response };
        } catch (err) {
          throw new RuntimeError(err as any);
        }
      }
      default: {
        throw new RuntimeError(
          "command or query does not exist, or is not supported in current version",
        );
      }
    }
  }

  /**
   * Run Iroha transaction based on already signed transaction received from the client.
   *
   * @param req RunTransactionSignedRequestV1
   * @param commandService Iroha SDK `CommandService_v1Client` instance
   * @returns `Promise<RunTransactionResponse>`
   */
  private async transactSigned(
    req: RunTransactionSignedRequestV1,
    commandService: CommandService,
  ): Promise<RunTransactionResponse> {
    if (!req.baseConfig || !req.baseConfig.timeoutLimit) {
      throw new RuntimeError("baseConfig.timeoutLimit is undefined");
    }

    try {
      const transactionBinary = Uint8Array.from(
        Object.values(req.signedTransaction),
      );
      const signedTransaction = Transaction.deserializeBinary(
        transactionBinary,
      );
      this.log.debug("Received signed transaction:", signedTransaction);

      const sendResponse = await new TxBuilder(signedTransaction).send(
        commandService,
        req.baseConfig.timeoutLimit,
      );

      return { transactionReceipt: sendResponse };
    } catch (error) {
      throw new RuntimeError(error as any);
    }
  }

  /**
   * Entry point for transact endpoint.
   * Validate common `baseConfig` arguments and perapre command and query services.
   * Call different transaction logic depending on input arguments.
   *
   * @note TLS connections are not supported yet.
   * @param req `RunTransactionSignedRequestV1 | RunTransactionRequestV1`
   * @returns `Promise<RunTransactionResponse>`
   */
  public async transact(
    req: RunTransactionSignedRequestV1 | RunTransactionRequestV1,
  ): Promise<RunTransactionResponse> {
    const { baseConfig } = req;
    if (!baseConfig || !baseConfig.irohaHost || !baseConfig.irohaPort) {
      throw new RuntimeError("Missing Iroha URL information.");
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

    if ("signedTransaction" in req) {
      return this.transactSigned(req, commandService);
    } else {
      return this.transactRequest(req, commandService, queryService);
    }
  }

  /**
   * Check if given Iroha command is supported and can be safely called on the `TxBuilder`.
   * Command must be listend in OpenAPI interface and be present on the builder object.
   * @param builder `TxBuilder` that will be used to call the command on.
   * @param command Iroha command name in string format.
   * @returns `true` if command is safe, `false` otherwise.
   */
  private isSafeIrohaCommand(builder: TxBuilder, command: string): boolean {
    // Check if command is listen in the OpenAPI interface
    if (!Object.values(IrohaCommand).includes(command as IrohaCommand)) {
      this.log.debug("Command not listed in OpenAPI interface");
      return false;
    }

    // Check if function is present in builder object
    return (
      command in builder && typeof (builder as any)[command] === "function"
    );
  }

  /**
   * Entry point for generate unsigned transaction endpoint.
   * Transaction must be deserialized and signed on the client side.
   * It can be then send to transact endpoint for futher processing.
   * @param req `GenerateTransactionRequestV1`
   * @returns `Uint8Array` of serialized transaction.
   */
  public generateTransaction(req: GenerateTransactionRequestV1): Uint8Array {
    req.quorum = req.quorum ?? 1;
    const builder = new TxBuilder();

    if (!this.isSafeIrohaCommand(builder, req.commandName)) {
      throw new RuntimeError(
        `Bad Request: Not supported Iroha command '${req.commandName}' - aborted.`,
      );
    }

    try {
      return (builder as any)
        [req.commandName](req.commandParams)
        .addMeta(req.creatorAccountId, req.quorum)
        .tx.serializeBinary();
    } catch (error) {
      throw new RuntimeError(error as any);
    }
  }
}
