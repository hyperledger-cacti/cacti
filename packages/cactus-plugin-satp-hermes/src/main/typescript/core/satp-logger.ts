import {
  ILoggerOptions,
  LogLevelDesc,
  Logger,
} from "@hyperledger/cactus-common";
import { MonitorService } from "../services/monitoring/monitor";

export class SATPLogger {
  private readonly backend: Logger;
  private readonly monitorService: MonitorService;

  constructor(
    public readonly options: ILoggerOptions,
    monitorService: MonitorService,
  ) {
    const level: LogLevelDesc = options.level || "warn";
    this.backend = new Logger({ label: options.label, level });
    this.monitorService = monitorService;
  }

  public setLogLevel(logLevel: LogLevelDesc): void {
    this.backend.setLogLevel(logLevel);
  }

  public async shutdown(): Promise<void> {
    this.backend.info("Shut down logger OK.");
    this.monitorService.createLog("info", "Shut down logger OK.");
  }

  public error(...msg: unknown[]): void {
    this.backend.error(...msg);
    this.monitorService.createLog("error", ...msg);
  }

  public warn(...msg: unknown[]): void {
    this.backend.warn(...msg);
    this.monitorService.createLog("warn", ...msg);
  }
  public info(...msg: unknown[]): void {
    this.backend.info(...msg);
    this.monitorService.createLog("info", ...msg);
  }
  public debug(...msg: unknown[]): void {
    this.backend.debug(...msg);
    this.monitorService.createLog("debug", ...msg);
  }
  public trace(...msg: unknown[]): void {
    this.backend.trace(...msg);
    this.monitorService.createLog("trace", ...msg);
  }
}
