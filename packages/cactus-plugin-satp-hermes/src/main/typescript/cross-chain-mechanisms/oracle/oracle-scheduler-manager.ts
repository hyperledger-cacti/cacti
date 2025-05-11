import {
  Logger,
  LogLevelDesc,
  ILoggerOptions,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { OracleAbstract } from "./oracle-abstract";
import { IOracleListenerBase } from "./oracle-types";

export interface IOraclePollingManagerOptions {
  logLevel?: LogLevelDesc;
}

export class OracleSchedulerManager {
  public static readonly CLASS_NAME = "OracleSchedulerManager";
  private readonly logger: Logger;

  private pollers: Map<string, NodeJS.Timeout>;
  private eventListeners: Map<string, { unsubscribe: () => void }>;

  constructor(options: IOraclePollingManagerOptions) {
    const fnTag = `${OracleSchedulerManager.CLASS_NAME}#constructor()`;
    if (!options) {
      throw new Error(`${fnTag}: OracleSchedulerManager options are required`);
    }
    const logLevel = (options.logLevel || "INFO") as LogLevelDesc;
    const loggerOptions: ILoggerOptions = {
      level: logLevel,
      label: OracleSchedulerManager.CLASS_NAME,
    };
    this.logger = LoggerProvider.getOrCreate(loggerOptions);
    this.logger.info(`${fnTag}: Initializing OracleSchedulerManager`);

    this.pollers = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Adds a new listener that periodically calls the provided callback function.
   * @param id - Unique identifier for the listener.
   * @param callback - The function to be called periodically.
   * @param intervalMs - The interval in milliseconds for the polling.
   */
  addPoller(id: string, callback: () => void, intervalMs: number): void {
    const fnTag = `${OracleSchedulerManager.CLASS_NAME}#addPoller`;
    this.logger.debug(
      `${fnTag}: Create poller for task ${id} with interval ${intervalMs} ms`,
    );
    if (this.pollers.has(id)) {
      throw new Error(`Poller with id "${id}" already exists.`);
    }

    const interval = setInterval(callback, intervalMs);
    this.pollers.set(id, interval);
  }

  /**
   * Removes a listener by its unique identifier.
   * @param id - The unique identifier of the listener to remove.
   */
  removePoller(id: string): void {
    const interval = this.pollers.get(id);
    if (!interval) {
      throw new Error(`Poller with id "${id}" does not exist.`);
    }

    clearInterval(interval);
    this.pollers.delete(id);
  }

  /**
   * Lists all current poller identifiers.
   * @returns An array of poller IDs.
   */
  listPollers(): string[] {
    return Array.from(this.pollers.keys());
  }

  /**
   * Lists all current listener identifiers.
   * @returns An array of listener IDs.
   */
  listListeners(): string[] {
    return Array.from(this.eventListeners.keys());
  }

  /**
   * Adds an event listener for a specific oracle.
   * @param oracle - The oracle instance to listen to.
   * @param callback - The callback function to be called when the event occurs.
   */
  async addEventListener(
    oracle: OracleAbstract,
    taskId: string,
    args: IOracleListenerBase,
    callback: (params: string[]) => void,
    filter?: string[],
  ): Promise<void> {
    const fnTag = `${OracleSchedulerManager.CLASS_NAME}#addEventListener`;
    this.logger.debug(
      `${fnTag}: Adding event listener for oracle with args: ${JSON.stringify(args)}`,
    );

    const subscriber = await oracle.subscribeContractEvent(
      args,
      (params: string[]) => {
        callback(params);
      },
      filter,
    );

    this.eventListeners.set(taskId, subscriber);
  }

  /**
   * Removes an event listener by its unique identifier.
   * @param taskId - The unique identifier of the listener to remove.
   */
  async removeEventListener(taskId: string): Promise<void> {
    const fnTag = `${OracleSchedulerManager.CLASS_NAME}#removeEventListener`;
    this.logger.debug(
      `${fnTag}: Removing event listener with taskId: ${taskId}`,
    );
    const subscriber = this.eventListeners.get(taskId);
    if (!subscriber) {
      this.logger.warn(
        `${fnTag}: No event listener found with taskId: ${taskId}`,
      );
      return;
    }
    subscriber.unsubscribe();

    this.eventListeners.delete(taskId);
    this.logger.debug(
      `${fnTag}: Event listener with taskId: ${taskId} removed successfully`,
    );
  }

  /**
   * Clears all pollers and listeners.
   */
  async clearAll(): Promise<void> {
    this.logger.info(
      `${OracleSchedulerManager.CLASS_NAME}#clearAllListeners(): Clearing ${this.pollers.size} pollers`,
    );
    this.pollers.forEach((interval) => clearInterval(interval));
    this.pollers.clear();

    this.logger.info(
      `${OracleSchedulerManager.CLASS_NAME}#clearAllListeners(): Clearing ${this.eventListeners.size} event listeners`,
    );
    this.eventListeners.forEach(async (subscriber) => subscriber.unsubscribe());
    this.eventListeners.clear();
    this.logger.info(
      `${OracleSchedulerManager.CLASS_NAME}#clearAllListeners(): All listeners cleared`,
    );
  }
}
