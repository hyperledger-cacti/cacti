import { Logger, LoggerProvider, ILoggerOptions } from "some-logger-lib"; // adjust as needed
import { safeStableStringify } from "safe-stable-stringify";
import { OracleNotificationDispatcher } from "./oracle-notification-dispatcher";
import { OracleTaskScheduler } from "./oracle-task-scheduler";
import { OracleRelayer } from "./oracle-relayer";

// Replace these with the actual types defined in your project:
import { FabricConnectorOptions } from "../ledger-connectors/fabric-connector-types";
import { EthereumConnectorOptions } from "../ledger-connectors/ethereum-connector-types";
import { PluginBungeeHermes } from "../ledger-connectors/plugin-bungee-hermes";

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
}

export interface IOracleManagerOptions {
  logLevel?: string;
  instanceId: string;
  fabricConnectorConfig: FabricConnectorOptions;
  ethereumConnectorConfig: EthereumConnectorOptions;
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
  details?: any; // e.g. proofs, tx hashes, etc.
}

export class OracleManager {
  public static readonly CLASS_NAME = "OracleManager";
  private readonly logger: Logger;
  private readonly instanceId: string;
  private readonly fabricConnectorConfig: FabricConnectorOptions;
  private readonly ethereumConnectorConfig: EthereumConnectorOptions;
  private tasks: IOracleTask[];

  // Map to store the status for a given taskId
  private taskStatusMap: Map<string, OracleTaskStatus> = new Map();

  private readonly notificationDispatcher: OracleNotificationDispatcher;
  private readonly taskScheduler: OracleTaskScheduler;
  private readonly relayer: OracleRelayer;
  private readonly bungee: PluginBungeeHermes;

  constructor(public readonly options: IOracleManagerOptions) {
    const fnTag = `${OracleManager.CLASS_NAME}#constructor()`;
    if (!options) {
      throw new Error(`${fnTag}: OracleManager options are required`);
    }
    this.instanceId = options.instanceId;
    const level = options.logLevel || "INFO";
    const loggerOptions: ILoggerOptions = { level, label: OracleManager.CLASS_NAME };
    this.logger = LoggerProvider.getOrCreate(loggerOptions);
    this.logger.info(`${fnTag}: Initializing OracleManager with instanceId ${this.instanceId}`);

    this.fabricConnectorConfig = options.fabricConnectorConfig;
    this.ethereumConnectorConfig = options.ethereumConnectorConfig;
    this.bungee = options.bungee;
    this.tasks = options.initialTasks || [];

    // Set initial status to PENDING for each provided task.
    this.tasks.forEach((task) => {
      this.taskStatusMap.set(task.id, {
        taskId: task.id,
        status: OracleTaskStatusEnum.PENDING,
      });
    });

    // Initialize sub-components:
    this.notificationDispatcher = new OracleNotificationDispatcher({ logger: this.logger });
    this.taskScheduler = new OracleTaskScheduler({ logger: this.logger, tasks: this.tasks });
    // Pass the bungee instance to the relayer so that it can generate proofs if needed.
    this.relayer = new OracleRelayer({ logger: this.logger, bungee: this.bungee });
  }

  // Registers the task and schedules it for execution.
  public addTask(task: IOracleTask): string {
    const fnTag = `${OracleManager.CLASS_NAME}#addTask()`;
    this.logger.info(`${fnTag}: Adding task ${safeStableStringify(task)}`);
    this.tasks.push(task);
    // Set initial status.
    this.taskStatusMap.set(task.id, {
      taskId: task.id,
      status: OracleTaskStatusEnum.PENDING,
    });
    // Schedule the task asynchronously.
    this.taskScheduler.scheduleTask(task);
    // Returns the task id to be used in the status endpoint.
    return task.id;
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

    // Update the status to PENDING (in case the execution is re-triggered).
    this.taskStatusMap.set(task.id, { taskId: task.id, status: OracleTaskStatusEnum.PENDING });

    try {
      // Execute the task via the relayer.
      const resultDetails = await this.relayer.relayTask(
        task,
        this.fabricConnectorConfig,
        this.ethereumConnectorConfig,
        // bungee is passed to generate proofs for the task execution if needed
        this.bungee,
      );
      // Update the status to SUCCESS including any result details (e.g. tx hashes, generated proofs).
      this.taskStatusMap.set(task.id, {
        taskId: task.id,
        status: OracleTaskStatusEnum.SUCCESS,
        details: resultDetails,
      });
      // Dispatch a success notification.
      this.notificationDispatcher.dispatchNotification({
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
      });
      // Dispatch a failure notification.
      this.notificationDispatcher.dispatchNotification({
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
      return { taskId, status: OracleTaskStatusEnum.NOT_FOUND };
    }
    return status;
  }

  public async shutdown(): Promise<void> {
    const fnTag = `${OracleManager.CLASS_NAME}#shutdown()`;
    this.logger.info(`${fnTag}: Shutting down OracleManager`);
    await this.taskScheduler.shutdown();
    // Add shutdown operations for additional sub-components if needed.
  }
}
