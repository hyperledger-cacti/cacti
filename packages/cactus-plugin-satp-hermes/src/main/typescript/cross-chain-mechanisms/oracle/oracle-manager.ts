import {
  type ILoggerOptions,
  type Logger,
  LoggerProvider,
  type LogLevelDesc,
} from "@hyperledger/cactus-common";
import { OracleNotificationDispatcher } from "./oracle-notification-dispatcher";
import { OracleRelayer } from "./oracle-relayer";

import type {
  FabricSigningCredential,
  IPluginLedgerConnectorFabricOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import type {
  IPluginLedgerConnectorBesuOptions,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import type {
  IPluginBungeeHermesOptions,
  PluginBungeeHermes,
} from "@hyperledger/cactus-plugin-bungee-hermes";
import { OracleFabric } from "./oracle-fabric";
import { OracleEVM } from "./oracle-evm";

export enum OracleTaskType {
  READ = "READ",
  UPDATE = "UPDATE",
}
// Task interface must include smart contract addresses, function or event parameters, session id, optional callback, etc.
export interface IOracleTask {
  id: string;
  sourceChainId: string;
  targetChainId: string;
  sourceContractId: string;
  targetContractId: string;
  // trigger could be an event name or a function endpoint description
  trigger: string;
  // Additional fields for event/function details
  [key: string]: any;
  // For data transfer
  sessionId: string;
  callbackUrl?: string;
  type: OracleTaskType;
}

export interface IOracleManagerOptions {
  logLevel?: string;
  instanceId: string;
  fabricConnectorConfig: IPluginLedgerConnectorFabricOptions;
  ethereumConnectorConfig: IPluginLedgerConnectorBesuOptions;
  bungee: PluginBungeeHermes;
  initialTasks?: IOracleTask[];
}

// Define status values for oracle tasks.
export enum OracleTaskStatusEnum {
  NOT_FOUND = "NOT_FOUND",
  INVALID = "INVALID",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export interface OracleTaskStatus {
  taskId: string;
  status: OracleTaskStatusEnum;
  details?: any;
  conditions: Array<(params: string[]) => boolean>;
  action: OracleTaskType;
  arguments: string[];
}

export class OracleManager {
  public static readonly CLASS_NAME = "OracleManager";
  private readonly logger: Logger;
  private readonly instanceId: string;
  private readonly fabricConnectorConfig: IPluginLedgerConnectorFabricOptions;
  private readonly ethereumConnectorConfig: IPluginLedgerConnectorBesuOptions;
  private tasks: IOracleTask[];

  // Map to store the status for a given taskId
  private taskStatusMap: Map<string, OracleTaskStatus> = new Map();

  private readonly notificationDispatcher: OracleNotificationDispatcher;
  private readonly relayer: OracleRelayer;
  private readonly bungee: PluginBungeeHermes;

  constructor(public readonly options: IOracleManagerOptions) {
    const fnTag = `${OracleManager.CLASS_NAME}#constructor()`;
    if (!options) {
      throw new Error(`${fnTag}: OracleManager options are required`);
    }
    this.instanceId = options.instanceId;
    const level = (options.logLevel || "INFO") as LogLevelDesc;
    const loggerOptions: ILoggerOptions = {
      level,
      label: OracleManager.CLASS_NAME,
    };
    this.logger = LoggerProvider.getOrCreate(loggerOptions);
    this.logger.info(
      `${fnTag}: Initializing OracleManager with instanceId ${this.instanceId}`,
    );

    this.fabricConnectorConfig = options.fabricConnectorConfig;
    this.ethereumConnectorConfig = options.ethereumConnectorConfig;
    this.bungee = options.bungee;
    this.tasks = options.initialTasks || [];

    // Set initial status to PENDING for each provided task.
    for (const task of this.tasks) {
      this.taskStatusMap.set(task.id, {
        taskId: task.id,
        status: OracleTaskStatusEnum.PENDING,
        conditions: [],
        action: task.type,
        arguments: [],
      });
    }

    this.notificationDispatcher = new OracleNotificationDispatcher({
      logger: this.logger,
    });
    const oracleFabric = new OracleFabric({
      oracleConfig: {
        contractName: "fabricContract",
        channelName: "mychannel",
        keychainId: "fabricKeychain",
        signingCredential: {} as FabricSigningCredential, // todo fix
        network: {
          id: "fabric-network-id",
          ledgerType: "fabric",
        },
        options: {}, // Provide valid connector options
        bungeeOptions: {} as IPluginBungeeHermesOptions, // todo fix
      },
      connectorConfig: this.fabricConnectorConfig,
      bungee: this.bungee,
    });

    const oracleEVM = new OracleEVM({
      oracleConfig: {
        contractName: "evmContract",
        keychainId: "evmKeychain",
        signingCredential: {} as Web3SigningCredential, // todo fix
        gas: 3000000,
        network: {
          id: "evm-network-id",
          ledgerType: "evm",
        },
        options: {}, // Provide valid connector options
        bungeeOptions: {} as IPluginBungeeHermesOptions, // todo fix
      },
      connectorConfig: this.ethereumConnectorConfig,
      bungee: this.bungee,
    });

    this.relayer = new OracleRelayer({
      logger: this.logger,
      fabric: oracleFabric,
      evm: oracleEVM,
      scheduledTasks: this.tasks, // todo, needed?
    });
  }

  public getTasks(): IOracleTask[] {
    return this.tasks;
  }

  // Executes the task by its id.
  // Note: Execution now calls OracleRelayer.relayTask, passing in the bungee instance.
  public async executeTask(taskId: string): Promise<void> {
    const fnTag = `${OracleManager.CLASS_NAME}#executeTask()`;
    this.logger.info(`${fnTag}: Executing task ${taskId}`);
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`${fnTag}: Task with id ${taskId} not found`);
    }

    this.taskStatusMap.set(task.id, {
      taskId: task.id,
      status: OracleTaskStatusEnum.PENDING,
      conditions: [],
      action:
        task.type === OracleTaskType.READ
          ? OracleTaskType.READ
          : OracleTaskType.UPDATE,
      arguments: [],
    });

    try {
      // Execute the task via the relayer.
      const resultDetails = await this.relayer.relayTask(task);

      // Update the status to SUCCESS including any result details (e.g. tx hashes, generated proofs).
      this.taskStatusMap.set(task.id, {
        taskId: task.id,
        status: OracleTaskStatusEnum.SUCCESS,
        details: resultDetails,
        conditions: [],
        action:
          task.type === OracleTaskType.READ
            ? OracleTaskType.READ
            : OracleTaskType.UPDATE,
        arguments: [],
      });
      // Dispatch a success notification.
      await this.notificationDispatcher.dispatchNotification({
        taskId: task.id,
        status: OracleTaskStatusEnum.SUCCESS,
        message: `Task ${task.id} executed successfully.`,
        details: resultDetails,
      });
    } catch (error) {
      // On error, update status to FAILED.
      this.taskStatusMap.set(task.id, {
        taskId: task.id,
        status: OracleTaskStatusEnum.FAILED,
        details: { error: error.message },
        conditions: [],
        action:
          task.type === OracleTaskType.READ
            ? OracleTaskType.READ
            : OracleTaskType.UPDATE,
        arguments: [],
      });
      // Dispatch a failure notification.
      await this.notificationDispatcher.dispatchNotification({
        taskId: task.id,
        status: OracleTaskStatusEnum.FAILED,
        message: `Task ${task.id} failed to execute.`,
        details: { error: error.message },
      });
      throw error;
    }
  }

  // Returns the status for a given task id.
  public getStatus(taskId: string): OracleTaskStatus {
    const fnTag = `${OracleManager.CLASS_NAME}#getStatus()`;
    const status = this.taskStatusMap.get(taskId);
    if (!status) {
      this.logger.warn(`${fnTag}: Task status for id ${taskId} not found`);
      return {
        taskId,
        status: OracleTaskStatusEnum.NOT_FOUND,
        conditions: [],
        action: OracleTaskType.READ,
        arguments: [],
      };
    }
    return status;
  }

  public async shutdown(): Promise<void> {
    const fnTag = `${OracleManager.CLASS_NAME}#shutdown()`;
    this.logger.info(`${fnTag}: Shutting down OracleManager`);
    // todo
  }
}
