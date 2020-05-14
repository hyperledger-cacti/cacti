import { Logger, ILoggerOptions } from './logger';

export class LoggerProvider {

  private static loggers: Map<string, Logger> = new Map();

  public static getOrCreate(loggerOptions: ILoggerOptions) {
    let logger: Logger | undefined = LoggerProvider.loggers.get(loggerOptions.label);
    if (!logger) {
      logger = new Logger(loggerOptions);
      LoggerProvider.loggers.set(loggerOptions.label, logger);
    }
    return logger;
  }
}
