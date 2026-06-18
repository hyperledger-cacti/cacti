import type { OracleLog } from "../core/types";
import type { IOracleLogRepository } from "./repository/interfaces/repository";
import type { LogLevelDesc } from "@hyperledger-cacti/cactus-common";
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

/**
 * Stringifies `value` safely, returning a small JSON error envelope when
 * serialization fails (handles cycles and BigInt values).
 */
export function safeStringifyOracleLogValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    const seen = new WeakSet<object>();
    const result = JSON.stringify(value, (_key, val) => {
      if (typeof val === "bigint") {
        return val.toString();
      }
      if (val !== null && typeof val === "object") {
        if (seen.has(val as object)) {
          return "[Circular]";
        }
        seen.add(val as object);
      }
      return val;
    });
    return result ?? "";
  } catch (err) {
    return JSON.stringify({
      serializationError: err instanceof Error ? err.message : String(err),
    });
  }
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

        // Sanitize user-supplied fields to ensure safe serialization
        // (handles non-string values, cyclic references, and BigInt).
        const serializedTaskId = safeStringifyOracleLogValue(logEntry.taskId);
        const serializedData = safeStringifyOracleLogValue(logEntry.data);

        const key = `${serializedTaskId}-${logEntry.type}-${logEntry.operation}-${logEntry.sequenceNumber}`;
        const oracleLog: OracleLog = {
          taskId: serializedTaskId,
          type: logEntry.type,
          key: key,
          timestamp: Date.now().toString(),
          operation: logEntry.operation,
          data: serializedData,
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
