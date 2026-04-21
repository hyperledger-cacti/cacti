import type { OracleLog } from "../core/types";
import type { IOracleLogRepository } from "./repository/interfaces/repository";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLogger as Logger } from "../core/satp-logger";
import { SATPLoggerProvider as LoggerProvider } from "../core/satp-logger-provider";
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

export interface OracleLogEntry {
  taskId: string;
  type: string;
  operation: string;
  data: string;
  operationId?: string;
  sequenceNumber: number;
}

export interface IOraclePersistenceConfig {
  oracleLogRepository: IOracleLogRepository;
  logLevel?: LogLevelDesc;
  monitorService: MonitorService;
}

export class OraclePersistence {
  public static readonly CLASS_NAME = "OraclePersistence";
  public oracleLogRepository: IOracleLogRepository;
  private readonly log: Logger;
  private readonly monitorService: MonitorService;

  constructor(config: IOraclePersistenceConfig) {
    this.oracleLogRepository = config.oracleLogRepository;
    this.monitorService = config.monitorService;

    this.log = LoggerProvider.getOrCreate(
      {
        label: "OraclePersistence",
        level: config.logLevel || "INFO",
      },
      this.monitorService,
    );

    this.log.info("OraclePersistence initialized.");
  }

  public getOracleLogRepository(): IOracleLogRepository {
    return this.oracleLogRepository;
  }

  public async storeOracleLog(logEntry: OracleLogEntry): Promise<void> {
    const fnTag = `${OraclePersistence.CLASS_NAME}#storeOracleLog()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.info(
          `${fnTag} - Storing oracle log entry for taskId: ${logEntry.taskId}`,
        );

        if (logEntry.data == undefined) {
          this.log.warn(`${fnTag} - No data provided in log entry.`);
          return;
        }

        const key = `${logEntry.taskId}-${logEntry.type}-${logEntry.operation}-${logEntry.sequenceNumber}`;
        const oracleLog: OracleLog = {
          taskId: logEntry.taskId,
          type: logEntry.type,
          key: key,
          timestamp: Date.now().toString(),
          operation: logEntry.operation,
          data: logEntry.data,
          operationId: logEntry.operationId,
          sequenceNumber: logEntry.sequenceNumber,
        };

        await this.oracleLogRepository.create(oracleLog);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
