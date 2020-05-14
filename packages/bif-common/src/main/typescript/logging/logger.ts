import libLogLevel, { Logger as LogLevelLogger, levels } from "loglevel";
import prefix from "loglevel-plugin-prefix";

prefix.reg(libLogLevel);

prefix.apply(libLogLevel, {
  template: "[%t] %l (%n):",
  levelFormatter(level) {
    return level.toUpperCase();
  },
  nameFormatter(name) {
    return name || "global";
  },
  timestampFormatter(date) {
    return date.toISOString();
  },
});

export interface ILoggerOptions {
  label: string;
  level?: string;
}

/**
 * Levels:
 *  - error: 0,
 *  - warn: 1,
 *  - info: 2,
 *  - debug: 3,
 *  - trace: 4
 */
export class Logger {
  private readonly backend: LogLevelLogger;

  constructor(public readonly options: ILoggerOptions) {
    const level: string = options.level || "warn";
    this.backend = libLogLevel.getLogger(options.label);
    this.backend.setLevel(level.toUpperCase() as any);
  }

  public async shutdown(gracePeriodMillis: number = 60000): Promise<void> {
    this.backend.info("Shut down logger OK.");
  }

  public error(...msg: any[]): void {
    this.backend.error(...msg);
  }

  public warn(...msg: any[]): void {
    this.backend.warn(...msg);
  }
  public info(...msg: any[]): void {
    this.backend.info(...msg);
  }
  public debug(...msg: any[]): void {
    this.backend.debug(...msg);
  }
  public trace(...msg: any[]): void {
    this.backend.trace(...msg);
  }
}
