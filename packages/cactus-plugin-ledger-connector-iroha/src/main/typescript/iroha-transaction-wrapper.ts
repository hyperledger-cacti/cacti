import { Checks, Logger } from "@hyperledger/cactus-common";
import {
  LoggerProvider,
  LogLevelDesc,
  Http405NotAllowedError,
} from "@hyperledger/cactus-common";
import {
  IrohaBaseConfig,
  IrohaCommand,
  IrohaQuery,
  RunTransactionRequestV1,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios";

import { RuntimeError } from "run-time-error";
import * as grpc from "grpc";

import {
  GrantablePermission,
  GrantablePermissionMap,
} from "iroha-helpers/lib/proto/primitive_pb";

import { CommandService_v1Client as CommandService } from "iroha-helpers/lib/proto/endpoint_grpc_pb";
import { QueryService_v1Client as QueryService } from "iroha-helpers/lib/proto/endpoint_grpc_pb";

import commands from "iroha-helpers/lib/commands/index";
import queries from "iroha-helpers/lib/queries";

export interface IIrohaTransactionWrapperOptions {
  logLevel?: LogLevelDesc;
}

export class IrohaTransactionWrapper {
  private readonly log: Logger;
  public static readonly CLASS_NAME = "IrohaTransactionWrapper";

  public get className(): string {
    return IrohaTransactionWrapper.CLASS_NAME;
  }

  constructor(options: IIrohaTransactionWrapperOptions) {
    const level = options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  /**
   * Create instances of Iroha SDK CommandService and QueryService from input base config.
   *
   * @param baseConfig iroha configuration from request, must contain Iroha URL information.
   * @returns {commandService, queryService}
   */
  public static getIrohaServices(
    baseConfig: IrohaBaseConfig,
  ): {
    commandService: CommandService;
    queryService: QueryService;
  } {
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

    return { commandService, queryService };
  }

  public async transact(
    req: RunTransactionRequestV1,
  ): Promise<RunTransactionResponse> {
    const { baseConfig } = req;
    Checks.truthy(baseConfig, "baseConfig");
    Checks.truthy(baseConfig.privKey, "privKey in baseConfig");
    Checks.truthy(
      baseConfig.creatorAccountId,
      "creatorAccountId in baseConfig",
    );
    Checks.truthy(baseConfig.quorum, "quorum in baseConfig");
    Checks.truthy(baseConfig.timeoutLimit, "timeoutLimit in baseConfig");

    if (!baseConfig.privKey || !baseConfig.timeoutLimit) {
      // narrow the types
      throw new Error("Should never happen - Checks should catch this first");
    }

    const {
      commandService,
      queryService,
    } = IrohaTransactionWrapper.getIrohaServices(baseConfig);

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
}
