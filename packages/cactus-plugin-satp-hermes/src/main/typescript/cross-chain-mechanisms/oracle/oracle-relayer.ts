import {
  LoggerProvider,
  type Logger,
  type LogLevelDesc,
} from "@hyperledger/cactus-common";
import type {
  OracleFabric,
  ReadEntryArgs as FabricReadArgs,
} from "./oracle-fabric";
import type { OracleEVM, ReadEntryArgs as EVMReadArgs } from "./oracle-evm";
import { type IOracleTask, OracleTaskType } from "./oracle-manager";

export interface IOracleListener {
  taskId: string;
  chain: "fabric" | "evm";
  oracleEVM: OracleEVM;
  oracleFabric: OracleFabric;
  readArgs: EVMReadArgs | FabricReadArgs;
  taskType: OracleTaskType;
}

export type OracleTaskTriggerCondition = {
  type: string;
  scheduleTime?: Date;
};

export type ScheduledOracleTask = IOracleTask & {
  triggerCondition?: OracleTaskTriggerCondition;
};

export interface OracleRelayerOptions {
  logger: Logger;
  fabric: OracleFabric;
  evm: OracleEVM;
  scheduledTasks?: ScheduledOracleTask[];
}

export class OracleRelayer {
  public static readonly CLASS_NAME = "OracleRelayer";
  public readonly log: Logger;
  private readonly fabric: OracleFabric;
  private readonly evm: OracleEVM;
  // Scheduler fields.
  private scheduledTasks: ScheduledOracleTask[] = [];
  private listeners: IOracleListener[] = [];
  private pollerId: NodeJS.Timer | undefined;

  constructor(options: OracleRelayerOptions, level?: LogLevelDesc) {
    const label = OracleRelayer.CLASS_NAME;
    level = level || "INFO";
    this.log = options.logger ?? LoggerProvider.getOrCreate({ label, level });
    this.fabric = options.fabric;
    this.evm = options.evm;
    if (options.scheduledTasks) {
      this.scheduledTasks = options.scheduledTasks;
    }
    this.log.debug(`${label}#constructor: OracleRelayer initialized.`);
  }

  /**
   * Immediately dispatches a task to the appropriate oracle.
   */
  public async relayTask(task: IOracleTask): Promise<void> {
    const fnTag = `${OracleRelayer.CLASS_NAME}#relayTask`;
    this.log.debug(
      `${fnTag}: Relaying task ${task.id} to target ${task.targetChainId}`,
    );
    try {
      if (task.targetChainId.toLowerCase().includes("fabric")) {
        const entry = {
          channelName: this.fabric.network, // or derive from task details
          header: {
            targetChainId: task.targetChainId,
            sequenceNumber: Date.now(),
          },
          payload: JSON.stringify(task),
        };
        const { transactionResponse } = await this.fabric.updateEntry(entry);
        this.log.debug(
          `${fnTag}: Fabric transaction ${transactionResponse.transactionId} completed.`,
        );
      } else if (task.targetChainId.toLowerCase().includes("ethereum")) {
        const entry = {
          header: {
            targetChainId: task.targetChainId,
            sequenceNumber: Date.now(),
          },
          payload: JSON.stringify(task),
        };
        const { transactionResponse } = await this.evm.updateEntry(entry);
        this.log.debug(
          `${fnTag}: EVM transaction ${transactionResponse.transactionId} completed.`,
        );
      } else {
        this.log.warn(`${fnTag}: Unknown target chain: ${task.targetChainId}`);
      }
    } catch (error) {
      this.log.error(`${fnTag}: Failed to relay task.`, error);
      throw error;
    }
  }

  protected isTriggered(condition?: OracleTaskTriggerCondition): boolean {
    if (!condition) return false;
    if (condition.scheduleTime && condition.scheduleTime <= new Date())
      return true;
    return false;
  }

  private async executeTask(
    task: ScheduledOracleTask,
    chain: "fabric" | "evm",
    oracleEVM: OracleEVM,
    oracleFabric: OracleFabric,
    readArgs: EVMReadArgs | FabricReadArgs,
  ): Promise<void> {
    const fnTag = `${OracleRelayer.CLASS_NAME}#executeTask`;
    if (!this.isTriggered(task.triggerCondition)) return;
    this.log.debug(`${fnTag}: Executing scheduled task ${task.id}`);
    if (task.type === OracleTaskType.READ) {
      if (chain === "fabric") {
        const result = await oracleFabric.readEntry(readArgs as FabricReadArgs);
        this.log.debug(
          `${fnTag}: Fabric read result for task ${task.id}`,
          result,
        );
      } else {
        const result = await oracleEVM.readEntry(readArgs as EVMReadArgs);
        this.log.debug(`${fnTag}: EVM read result for task ${task.id}`, result);
      }
    } else {
      // For UPDATE tasks, use immediate relay.
      await this.relayTask(task);
    }
  }

  /**
   * Starts a polling mechanism that checks all listeners at a regular interval.
   */
  private pollAllTasks(intervalMs: number): void {
    const fnTag = `${OracleRelayer.CLASS_NAME}#pollAllTasks`;
    this.pollerId = setInterval(async () => {
      for (const listener of this.listeners) {
        const scheduledTask = this.scheduledTasks.find(
          (t) => t.id === listener.taskId,
        );
        if (!scheduledTask) {
          this.log.warn(
            `${fnTag}: No scheduled task found for listener ${listener.taskId}`,
          );
          continue;
        }
        try {
          await this.executeTask(
            scheduledTask,
            listener.chain,
            listener.oracleEVM,
            listener.oracleFabric,
            listener.readArgs,
          );
        } catch (err) {
          this.log.error(
            `${fnTag}: Error polling task ${listener.taskId}`,
            err,
          );
        }
      }
    }, intervalMs);
  }

  public addListener(
    task: IOracleTask,
    chain: "fabric" | "evm",
    oracleEVM: OracleEVM,
    oracleFabric: OracleFabric,
    intervalMs: number,
    readArgs: EVMReadArgs | FabricReadArgs,
    triggerCondition?: OracleTaskTriggerCondition,
  ): void {
    const fnTag = `${OracleRelayer.CLASS_NAME}#addListener`;
    const scheduledTask: ScheduledOracleTask = { ...task, triggerCondition };
    if (!this.scheduledTasks.find((t) => t.id === task.id)) {
      this.scheduledTasks.push(scheduledTask);
    }
    this.listeners.push({
      taskId: task.id,
      chain,
      oracleEVM,
      oracleFabric,
      readArgs,
      taskType: task.type,
    });
    if (this.listeners.length === 1) {
      // Start polling if first listener is added.
      this.pollAllTasks(intervalMs);
    }
    this.log.debug(`${fnTag}: Listener added for task ${task.id}`);
  }

  public removeListener(taskId: string): void {
    const fnTag = `${OracleRelayer.CLASS_NAME}#removeListener`;
    const idx = this.listeners.findIndex((l) => l.taskId === taskId);
    if (idx !== -1) {
      this.listeners.splice(idx, 1);
      this.log.debug(`${fnTag}: Removed listener for task ${taskId}`);
      if (this.listeners.length === 0 && this.pollerId) {
        clearInterval(this.pollerId);
        this.pollerId = undefined;
      }
    } else {
      this.log.debug(`${fnTag}: No active listener for task ${taskId}`);
    }
  }

  public async shutdown(): Promise<void> {
    const fnTag = `${OracleRelayer.CLASS_NAME}#shutdown`;
    this.log.debug(`${fnTag}: Shutting down relayer scheduler.`);
    if (this.pollerId) {
      clearInterval(this.pollerId);
      this.pollerId = undefined;
    }
    this.listeners = [];
  }
}
