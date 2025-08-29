import {
  type ILoggerOptions,
  type LogLevelDesc,
} from "@hyperledger/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import type { SATPLogger as Logger } from "../../core/satp-logger";
// import { OracleNotificationDispatcher } from "./oracle-notification-dispatcher";

import { IOracleEntryBase, IOracleListenerBase } from "./oracle-types";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { INetworkOptions } from "../bridge/bridge-types";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  DeployOracleError,
  OracleError,
  ReadAndUpdateTaskNoDataError,
  TaskNotFoundError,
  UnsupportedNetworkError,
} from "../common/errors";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { v4 as uuidv4 } from "uuid";
import { IOracleEVMOptions, OracleEVM } from "./implementations/oracle-evm";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  IOracleFabricOptions,
  OracleFabric,
} from "./implementations/oracle-fabric";
import { OracleAbstract } from "./oracle-abstract";
import { ClaimFormat } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  NetworkId,
  OracleOperation,
  OracleOperationStatusEnum,
  OracleOperationTypeEnum,
  OracleRegisterRequestTaskModeEnum,
  OracleResponse,
  OracleTask,
  OracleTaskModeEnum,
  OracleTaskStatusEnum,
  OracleTaskTypeEnum,
} from "../../public-api";
import { OracleExecutionLayer } from "./oracle-execution-layer";
import { updateOracleOperation } from "./oracle-utils";
import { IOracleBesuOptions, OracleBesu } from "./implementations/oracle-besu";
import { OracleSchedulerManager } from "./oracle-scheduler-manager";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

export interface IOracleManagerOptions {
  logLevel?: LogLevelDesc;
  bungee: IPluginBungeeHermesOptions | undefined;
  initialTasks?: OracleTask[];
  monitorService: MonitorService;
}

export class OracleManager {
  public static readonly CLASS_NAME = "OracleManager";
  private readonly logger: Logger;
  private readonly logLevel: LogLevelDesc = "INFO";
  private readonly monitorService: MonitorService;

  // Group oracle by the network, a network can have various oracles (bridges)
  private readonly oracles: Map<string, Map<string, OracleAbstract>> =
    new Map();

  // Map to store the status for a given task id.
  private taskStatusMap: Map<string, OracleTask> = new Map();

  // private readonly notificationDispatcher: OracleNotificationDispatcher;
  private readonly schedulerManager: OracleSchedulerManager;

  constructor(public readonly options: IOracleManagerOptions) {
    const fnTag = `${OracleManager.CLASS_NAME}#constructor()`;
    if (!options) {
      throw new Error(`${fnTag}: OracleManager options are required`);
    }
    const logLevel = (options.logLevel || "INFO") as LogLevelDesc;
    this.monitorService = options.monitorService;
    const loggerOptions: ILoggerOptions = {
      level: logLevel,
      label: OracleManager.CLASS_NAME,
    };
    this.logger = LoggerProvider.getOrCreate(
      loggerOptions,
      this.monitorService,
    );
    this.logger.info(`${fnTag}: Initializing OracleManager`);

    // this.notificationDispatcher = new OracleNotificationDispatcher({
    //   logger: this.logger,
    // });

    this.schedulerManager = new OracleSchedulerManager({
      logLevel: this.logLevel,
      monitorService: this.monitorService,
    });
  }

  /**
   * Getter for the scheduler manager.
   *
   * @returns {OracleSchedulerManager} The scheduler manager instance.
   */
  public getSchedulerManager(): OracleSchedulerManager {
    return this.schedulerManager;
  }

  /**
   * Deploys a new oracle based on the provided options.
   *
   * @param oracleNetworkOptions - The configuration options for the oracle to be deployed.
   * @throws {DeployOracleError} If the oracle is already deployed or if there is an error during deployment.
   * @throws {UnsupportedNetworkError} If the network type specified in the options is not supported.
   * @returns {Promise<void>} A promise that resolves when the oracle is successfully deployed.
   */
  public async deployOracle(
    oracleNetworkOptions: INetworkOptions,
  ): Promise<void> {
    const fnTag = `${OracleManager.CLASS_NAME}#deployOracle()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.logger.debug(`${fnTag}, Deploying Oracle...`);
        this.logger.debug(
          `${fnTag}, Oracle Network Options: ${JSON.stringify(oracleNetworkOptions)}`,
        );

        if (
          this.oracles.has(
            safeStableStringify(oracleNetworkOptions.networkIdentification),
          )
        ) {
          throw new DeployOracleError(
            `${fnTag}, Oracle already deployed: ${safeStableStringify(oracleNetworkOptions.networkIdentification)}`,
          );
        }

        try {
          let oracle: OracleAbstract;
          switch (oracleNetworkOptions.networkIdentification.ledgerType) {
            case LedgerType.Besu1X:
            case LedgerType.Besu2X:
              this.logger.debug(`${fnTag}, Deploying Besu Oracle...`);
              this.logger.debug(
                `${fnTag}, Besu Oracle Network Options: ${JSON.stringify(
                  oracleNetworkOptions,
                )}`,
              );
              const besuNetworkOptions =
                oracleNetworkOptions as unknown as IOracleBesuOptions;
              oracle = new OracleBesu({
                ...besuNetworkOptions,
                connectorOptions: {
                  ...besuNetworkOptions.connectorOptions,
                  instanceId: uuidv4(),
                  pluginRegistry: new PluginRegistry({
                    plugins: [],
                  }),
                  logLevel: this.logLevel,
                },
                monitorService: this.monitorService,
                logLevel: this.logLevel,
              });
              break;
            case LedgerType.Ethereum:
              this.logger.debug(`${fnTag}, Deploying Ethereum Oracle...`);
              this.logger.debug(
                `${fnTag}, Ethereum Oracle Network Options: ${JSON.stringify(
                  oracleNetworkOptions,
                )}`,
              );
              const ethereumNetworkOptions =
                oracleNetworkOptions as unknown as IOracleEVMOptions;
              oracle = new OracleEVM({
                ...ethereumNetworkOptions,
                connectorOptions: {
                  ...ethereumNetworkOptions.connectorOptions,
                  instanceId: uuidv4(),
                  pluginRegistry: new PluginRegistry({
                    plugins: [],
                  }),
                  logLevel: this.logLevel,
                },
                monitorService: this.monitorService,
                logLevel: this.logLevel,
              });
              break;
            case LedgerType.Fabric2:
              this.logger.debug(`${fnTag}, Deploying Fabric Oracle...`);
              this.logger.debug(
                `${fnTag}, Fabric Oracle Network Options: ${JSON.stringify(
                  oracleNetworkOptions,
                )}`,
              );
              if (
                !(oracleNetworkOptions as Partial<IOracleFabricOptions>)
                  .userIdentity
              ) {
                throw new DeployOracleError(
                  `${fnTag}, User Identity is required for Fabric network`,
                );
              }
              const keychainEntryKeyBridge = "bridgeKey";
              const fabricKeychain = new PluginKeychainMemory({
                instanceId: uuidv4(),
                keychainId: uuidv4(),
                logLevel: this.logLevel,
                backend: new Map([
                  [
                    keychainEntryKeyBridge,
                    JSON.stringify(
                      (oracleNetworkOptions as Partial<IOracleFabricOptions>)
                        .userIdentity,
                    ),
                  ],
                ]),
              });
              const fabricNetworkOptions = {
                ...oracleNetworkOptions,
                connectorOptions: {
                  ...(oracleNetworkOptions as Partial<IOracleFabricOptions>)
                    .connectorOptions,
                  instanceId: uuidv4(),
                  pluginRegistry: new PluginRegistry({
                    plugins: [fabricKeychain],
                  }),
                  logLevel: this.logLevel,
                },
                signingCredential: {
                  keychainId: fabricKeychain.getKeychainId(),
                  keychainRef: keychainEntryKeyBridge,
                },
              } as unknown as IOracleFabricOptions;
              oracle = new OracleFabric({
                ...fabricNetworkOptions,
                logLevel: this.logLevel,
                monitorService: this.monitorService,
              });
              break;
            default:
              throw new UnsupportedNetworkError(
                `${fnTag}, ${oracleNetworkOptions.networkIdentification.ledgerType} is not supported`,
              );
          }
          await oracle.deployContracts();

          const networkKey = safeStableStringify(
            oracleNetworkOptions.networkIdentification,
          );
          if (!this.oracles.has(networkKey)) {
            this.oracles.set(networkKey, new Map());
          }
          this.oracles.get(networkKey)?.set(oracle.getId(), oracle);
        } catch (error) {
          this.logger.debug(`${fnTag}, Error deploying oracle: ${error}`);
          throw new DeployOracleError(error);
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Retrieves the bridge endpoint (leaf) for the specified network ID.
   *
   * @param id - The network ID for which to retrieve the bridge endpoint.
   * @throws {OracleError} If the bridge endpoint is not available for the specified network ID.
   * @returns {OracleAbstract} The bridge endpoint associated with the specified network ID.
   */
  public getNetworkOracle(
    id: NetworkId,
    claimFormat: ClaimFormat = ClaimFormat.DEFAULT,
  ): OracleAbstract {
    const fnTag = `${OracleManager.CLASS_NAME}#getNetworkOracle()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.logger.debug(
          `${fnTag}, Getting Oracle for Network ID: ${safeStableStringify(id)}`,
        );

        const oracle = this.oracles.get(safeStableStringify(id));

        if (!oracle) {
          throw new OracleError(
            `${fnTag}, Oracle not available for network: ${safeStableStringify(id)}`,
          );
        }

        for (const leaf of oracle.values()) {
          if (leaf.getSupportedClaimFormats().includes(claimFormat)) {
            return leaf;
          }
        }

        throw new OracleError(
          `${fnTag}, Oracle not available: ${id}, with Claim Format: ${claimFormat}`,
        );
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Retrieves the SATP (Secure Asset Transfer Protocol) Execution Layer for a given network ID and claim type.
   *
   * @param id - The network ID for which the SATP Execution Layer is to be retrieved.
   * @param claimType - The format of the claim. Defaults to `ClaimFormat.DEFAULT` if not provided.
   * @returns An instance of `OracleExecutionLayer` configured with the specified network ID and claim type.
   */
  public getOracleExecutionLayer(
    id: NetworkId,
    claimType: ClaimFormat = ClaimFormat.DEFAULT,
  ): OracleExecutionLayer {
    const fnTag = `${OracleManager.CLASS_NAME}#getOracleExecutionLayer()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.logger.debug(`${fnTag}, Getting Oracle Execution Layer...`);

        return new OracleExecutionLayer({
          oracleImpl: this.getNetworkOracle(id, claimType),
          claimType,
          logLevel: this.logLevel,
          monitorService: this.monitorService,
        });
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public getTasks(): OracleTask[] {
    return Array.from(this.taskStatusMap.values());
  }

  public async registerTask(task: OracleTask): Promise<OracleTask> {
    const fnTag = `${OracleManager.CLASS_NAME}#registerTask()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.info(
          `${fnTag}: Registering task. ${safeStableStringify(task)}`,
        );

        try {
          this.taskStatusMap.set(task.taskID, task);
          task.timestamp = Date.now();
          task.status = OracleTaskStatusEnum.Active;

          // set up polling or event listener
          if (task.mode === OracleRegisterRequestTaskModeEnum.Polling) {
            this.schedulerManager.addPoller(
              task.taskID,
              async () => {
                try {
                  await this.processTask(task as OracleTask);
                  this.logger.info(
                    `${fnTag}: Task ${task.taskID} executed successfully`,
                  );
                  // TODO: Dispatch a success notification.
                } catch (error) {
                  // TODO: Dispatch a failure notification.
                }
              },
              task.pollingInterval!,
            );
          } else if (
            task.mode === OracleRegisterRequestTaskModeEnum.EventListening
          ) {
            const oracle = this.getNetworkOracle(task.srcNetworkId!);

            // this is implemented as follows: we set up a listener for the event
            // on the source contract, and when the event is emitted, we call the
            // process the relayOperation method with only the update operation

            await this.schedulerManager.addEventListener(
              oracle,
              task.taskID,
              {
                contractName: task.srcContract.contractName,
                contractAbi: task.srcContract.contractAbi,
                contractAddress: task.srcContract.contractAddress,
                eventSignature: task.listeningOptions?.eventSignature,
              } as IOracleListenerBase,
              async (params: string[]) => {
                const fnTag = `${OracleManager.CLASS_NAME}#addEventListener`;
                this.logger.debug(
                  `${fnTag}: Captured event emitted for task ${task.taskID} -- listened to ${params} from event ${task.listeningOptions?.eventSignature} in contract ${task.srcContract.contractAddress} on network ${task.srcNetworkId?.ledgerType}`,
                );

                if (!task.dstContract.params) {
                  // if params are not defined, we use the data captured in the event listened
                  await this.processTask(task as OracleTask, params);
                } else {
                  // Otherwise, we assume the event listener is only used as a trigger for the task
                  await this.processTask(task as OracleTask);
                }
              },
              task.listeningOptions?.filterParams,
            );
          }

          this.logger.info(`${fnTag}: Task registered successfully`);
          return task;
        } catch (error) {
          this.logger.debug(`${fnTag}: Error registering task: ${error}`);
          throw new OracleError(error);
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  // Unregisters a task by its id.
  public async unregisterTask(taskId: string): Promise<OracleTask> {
    const fnTag = `${OracleManager.CLASS_NAME}#unregisterTask()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.logger.info(`${fnTag}: Unregistering task with id ${taskId}`);

        const task = this.taskStatusMap.get(taskId);
        if (!task) {
          throw new Error(`${fnTag}: Task with id ${taskId} not found`);
        }

        if (task.mode === OracleTaskModeEnum.Immediate) {
          this.logger.info(
            `${fnTag}: Cannot unregister task with mode Immediate`,
          );
          return task;
        } else if (task.mode === OracleTaskModeEnum.Polling) {
          this.schedulerManager.removePoller(taskId);
        } else if (task.mode === OracleTaskModeEnum.EventListening) {
          this.schedulerManager.removeEventListener(taskId);
        }

        task.status = OracleTaskStatusEnum.Inactive;

        this.logger.info(`${fnTag}: Task with id ${taskId} unregistered`);

        return task;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async executeTask(task: OracleTask): Promise<OracleTask> {
    const fnTag = `${OracleManager.CLASS_NAME}#executeTask()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.info(`${fnTag}: Executing task with id ${task.taskID}`);

        this.taskStatusMap.set(task.taskID, task);
        task.timestamp = Date.now();

        try {
          task = await this.processTask(task);
          this.logger.info(`${fnTag}: Task executed successfully`);
          // TODO: Dispatch a success notification.
        } catch (error) {
          // TODO: Dispatch a failure notification.
        } finally {
          task.status = OracleTaskStatusEnum.Inactive;
        }

        return task;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  // Returns the status for a given task id.
  public getTask(taskId: string): OracleTask {
    const task = this.taskStatusMap.get(taskId);

    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    return task;
  }

  public getTaskStatus(taskId: string): OracleTaskStatusEnum {
    const task = this.getTask(taskId);
    return task.status;
  }

  public async processTask(
    task: OracleTask,
    params?: string[],
  ): Promise<OracleTask> {
    const fnTag = `${OracleManager.CLASS_NAME}#processTask`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.debug(`${fnTag}: Processing task ${task.taskID}`);

        // here, we decompose a task into multiple operations as needed and then call
        // relayOperation for each operation. A READ or UPDATE task are decomposed into
        // only one operation, but a READ_AND_UPDATE task is decomposed into two operations,
        // one READ and one UPDATE with the data read from the first operation.

        if (task.type === OracleTaskTypeEnum.Read) {
          const operation = {
            id: uuidv4(),
            type: OracleOperationTypeEnum.Read,
            networkId: task.srcNetworkId,
            contract: task.srcContract,
            status: OracleOperationStatusEnum.Pending,
            timestamp: Date.now(),
            output: undefined,
          } as OracleOperation;

          await this.relayOperation(task, operation);
        } else if (task.type === OracleTaskTypeEnum.Update) {
          if (params) {
            task.dstContract.params = params;
          }

          const operation = {
            id: uuidv4(),
            type: OracleOperationTypeEnum.Update,
            networkId: task.dstNetworkId,
            contract: task.dstContract,
            status: OracleOperationStatusEnum.Pending,
            timestamp: Date.now(),
            output: undefined,
          } as OracleOperation;

          await this.relayOperation(task, operation);
        } else if (task.type === OracleTaskTypeEnum.ReadAndUpdate) {
          let writeContent = params;

          // if there are params provided, we do not need to read the data
          // from the source contract, so we can skip the read operation
          if (!params) {
            const readOperation = {
              id: uuidv4(),
              type: OracleOperationTypeEnum.Read,
              networkId: task.srcNetworkId,
              contract: task.srcContract,
              status: OracleOperationStatusEnum.Pending,
              timestamp: Date.now(),
              output: undefined,
            } as OracleOperation;

            const readResponse = await this.relayOperation(task, readOperation);

            if (readResponse.output === undefined) {
              throw new ReadAndUpdateTaskNoDataError(task.taskID);
            }

            writeContent = [readResponse.output];
          }

          const updateOperation = {
            id: uuidv4(),
            type: OracleOperationTypeEnum.Update,
            networkId: task.dstNetworkId,
            contract: {
              ...task.dstContract,
              params:
                task.dstContract.params !== undefined &&
                task.dstContract.params?.length !== 0 // if params are empty, use the read response
                  ? task.dstContract.params
                  : writeContent,
            },
            status: OracleOperationStatusEnum.Pending,
            timestamp: Date.now(),
            output: undefined,
          } as OracleOperation;

          await this.relayOperation(task, updateOperation);
        }

        this.logger.debug(`${fnTag}: Task ${task.taskID} processed.`);
        return task;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Immediately dispatches an operation to the appropriate oracle.
   */
  public async relayOperation(
    task: OracleTask,
    operation: OracleOperation,
  ): Promise<OracleResponse> {
    const fnTag = `${OracleManager.CLASS_NAME}#relayOperation`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.debug(
          `${fnTag}: Relaying operation ${operation.id} to network ${safeStableStringify(operation.networkId)}`,
        );

        let response: OracleResponse;

        try {
          const oracle = this.getOracleExecutionLayer(operation.networkId);

          const entry = oracle.convertOperationToEntry(operation);

          if (operation.type === OracleOperationTypeEnum.Read) {
            response = await oracle.readEntry(entry as IOracleEntryBase);
          } else {
            response = await oracle.updateEntry(entry as IOracleEntryBase);
          }

          updateOracleOperation(
            operation,
            OracleOperationStatusEnum.Success,
            response,
          );
          task.operations.push(operation);
        } catch (error) {
          response = {
            output: error.message + ". " + error.cause.message,
          } as OracleResponse;

          this.logger.error(
            `${fnTag}: Error relaying operation ${operation.id}: ${error}`,
          );
          updateOracleOperation(
            operation,
            OracleOperationStatusEnum.Failed,
            response,
          );
          task.operations.push(operation);
          throw new OracleError(error);
        }

        this.logger.debug(
          `${fnTag}: Operation ${operation.id} relayed successfully`,
        );
        return response;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async shutdown(): Promise<void> {
    const fnTag = `${OracleManager.CLASS_NAME}#shutdown`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.logger.debug(`${fnTag}: Shutting down all listeners.`);
        await this.schedulerManager.clearAll();
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
