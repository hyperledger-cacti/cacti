import { ILoggerOptions, LogLevelDesc } from "@hyperledger/cactus-common";
import { Satp_Logger } from "./satp-logger";
import { MonitorService } from "../services/monitoring/monitor";

export class SatpLoggerProvider {
  private static loggers: Map<string, Satp_Logger> = new Map();
  private static logLevel: LogLevelDesc = "warn";

  public static getOrCreate(
    loggerOptions: ILoggerOptions,
    monitorService: MonitorService,
  ): Satp_Logger {
    // make sure log level is set to global default if otherwise wasn't provided
    loggerOptions.level = loggerOptions.level || SatpLoggerProvider.logLevel;

    let logger: Satp_Logger | undefined = SatpLoggerProvider.loggers.get(
      loggerOptions.label,
    );
    if (!logger) {
      logger = new Satp_Logger(loggerOptions, monitorService);
      SatpLoggerProvider.loggers.set(loggerOptions.label, logger);
    }
    return logger;
  }

  public static setLogLevel(
    logLevel: LogLevelDesc,
    applyToCachedLoggers = true,
  ): void {
    SatpLoggerProvider.logLevel = logLevel;
    if (applyToCachedLoggers) {
      SatpLoggerProvider.loggers.forEach((logger: Satp_Logger) =>
        logger.setLogLevel(logLevel as LogLevelDesc),
      );
    }
  }
}
