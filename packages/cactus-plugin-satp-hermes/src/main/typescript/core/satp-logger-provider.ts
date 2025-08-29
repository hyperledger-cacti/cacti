import { ILoggerOptions, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLogger } from "./satp-logger";
import { MonitorService } from "../services/monitoring/monitor";

export class SatpLoggerProvider {
  private static loggers: Map<string, SATPLogger> = new Map();
  private static logLevel: LogLevelDesc = "warn";

  public static getOrCreate(
    loggerOptions: ILoggerOptions,
    monitorService: MonitorService,
  ): SATPLogger {
    // make sure log level is set to global default if otherwise wasn't provided
    loggerOptions.level = loggerOptions.level || SatpLoggerProvider.logLevel;

    let logger: SATPLogger | undefined = SatpLoggerProvider.loggers.get(
      loggerOptions.label,
    );
    if (!logger) {
      logger = new SATPLogger(loggerOptions, monitorService);
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
      SatpLoggerProvider.loggers.forEach((logger: SATPLogger) =>
        logger.setLogLevel(logLevel as LogLevelDesc),
      );
    }
  }
}
