import libLogLevel, { Logger as LogLevelLogger, LogLevelDesc } from "loglevel";
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
  level?: LogLevelDesc;
  stream?: NodeJS.WritableStream; // Optional custom writable stream
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
  private stream?: NodeJS.WritableStream;
  private readonly backend: LogLevelLogger;

  constructor(public readonly options: ILoggerOptions) {
    const level: LogLevelDesc = options.level || "warn";
    this.backend = libLogLevel.getLogger(options.label);
    this.backend.setLevel(level);
    this.stream = options.stream; // Save the custom stream if provided
  }

  public setLogLevel(logLevel: LogLevelDesc): void {
    this.backend.setLevel(logLevel);
  }

  public async shutdown(): Promise<void> {
    this.backend.info("Shut down logger OK.");
  }

  private logToStream(level: string, ...msg: unknown[]): void {
    if (this.stream) {
      const timestamp = new Date().toISOString();
      const label = this.options.label || "global";
      const formattedMessage = `[${timestamp}] ${level} (${label}): ${msg
        .map((m) => (typeof m === "object" ? JSON.stringify(m) : String(m)))
        .join(" ")}`;
      this.stream.write(formattedMessage + "\n");
    }
  }

  public error(...msg: unknown[]): void {
    this.logToStream("ERROR", ...msg);
    this.backend.error(...msg);
  }
  public warn(...msg: unknown[]): void {
    this.logToStream("WARN", ...msg);
    this.backend.warn(...msg);
  }
  public info(...msg: unknown[]): void {
    this.logToStream("INFO", ...msg);
    this.backend.info(...msg);
  }
  public debug(...msg: unknown[]): void {
    this.logToStream("DEBUG", ...msg);
    this.backend.debug(...msg);
  }
  public trace(...msg: unknown[]): void {
    this.logToStream("TRACE", ...msg);
    this.backend.trace(...msg);
  }
}
