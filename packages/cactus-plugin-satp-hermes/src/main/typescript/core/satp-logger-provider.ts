import { ILoggerOptions, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLogger } from "./satp-logger";
import { MonitorService } from "../services/monitoring/monitor";

export class SATPLoggerProvider {
  private static loggers: Map<string, SATPLogger> = new Map();
  private static logLevel: LogLevelDesc = "warn";

  public static getOrCreate(
    loggerOptions: ILoggerOptions,
    monitorService: MonitorService,
  ): SATPLogger {
    // make sure log level is set to global default if otherwise wasn't provided
    loggerOptions.level = loggerOptions.level || SATPLoggerProvider.logLevel;

    let logger: SATPLogger | undefined = SATPLoggerProvider.loggers.get(
      loggerOptions.label,
    );
    if (!logger) {
      logger = new SATPLogger(loggerOptions, monitorService);
      SATPLoggerProvider.loggers.set(loggerOptions.label, logger);
    }
    return logger;
  }

  public static setLogLevel(
    logLevel: LogLevelDesc,
    applyToCachedLoggers = true,
  ): void {
    SATPLoggerProvider.logLevel = logLevel;
    if (applyToCachedLoggers) {
      SATPLoggerProvider.loggers.forEach((logger: SATPLogger) =>
        logger.setLogLevel(logLevel as LogLevelDesc),
      );
    }
  }
}
