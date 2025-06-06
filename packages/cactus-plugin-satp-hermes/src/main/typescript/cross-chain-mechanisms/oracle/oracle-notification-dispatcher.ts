// todo implement
// tasks provide callback urls for notifications, this service calls those callbacks

import { type LogLevelDesc } from "@hyperledger/cactus-common";
import { SatpLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import type { SATPLogger as Logger } from "../../core/satp-logger";
import {
  OracleTask,
  OracleTaskStatusEnum,
  OracleTaskTypeEnum,
} from "../../public-api";
import { MonitorService } from "../../services/monitoring/monitor";

export interface OracleNotificationDispatcherOptions {
  logger: Logger;
  monitorService: MonitorService;
}

export interface OracleNotification {
  taskId: string;
  taskType: OracleTaskTypeEnum;
  mode?: OracleTask;
  status: OracleTaskStatusEnum;
  message: string;
  details?: any;
}

export class OracleNotificationDispatcher {
  public static readonly CLASS_NAME = "OracleNotificationDispatcher";
  private readonly log: Logger;
  private readonly monitorService: MonitorService;

  constructor(
    options: OracleNotificationDispatcherOptions,
    level?: LogLevelDesc,
  ) {
    const label = OracleNotificationDispatcher.CLASS_NAME;
    level = level || "INFO";
    this.monitorService = options.monitorService;
    this.log =
      options.logger ??
      LoggerProvider.getOrCreate({ label, level }, this.monitorService);
    this.log.debug(
      `${label}#constructor: OracleNotificationDispatcher initialized.`,
    );
  }

  public async dispatchNotification(
    notification: OracleNotification,
  ): Promise<void> {
    const fnTag = `${OracleNotificationDispatcher.CLASS_NAME}#dispatchNotification`;
    this.log.debug(
      `${fnTag}: Dispatching notification for task ${notification.taskId}`,
    );

    try {
      // TODO: Implement actual callback dispatch logic
      this.log.info(`${fnTag}: TBD:`, notification);
    } catch (error) {
      this.log.error(`${fnTag}: Failed to dispatch notification:`, error);
      throw error;
    }
  }
}
