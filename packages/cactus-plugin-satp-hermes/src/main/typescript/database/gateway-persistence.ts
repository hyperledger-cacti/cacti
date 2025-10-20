import { Log, SATPLocalLog, SATPRemoteLog, OracleLocalLog } from "./core/types";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./repository/interfaces/repository";
import { JsObjectSigner, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLogger as Logger } from "../core/satp-logger";
import { SATPLoggerProvider as LoggerProvider } from "../core/satp-logger-provider";
import { SHA256 } from "crypto-js";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  bufArray2HexStr,
  getOracleLogKey,
  getSatpLogKey,
  sign,
} from "./gateway-utils";
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

interface SATPGatewayLogEntryPersistence {
  sessionID: string;
  type: string;
  operation: string;
  data: string;
  sequenceNumber: number;
}

interface OracleGatewayLogEntryPersistence {
  type: string;
  operation: string;
  data: string;
  taskId: string;
  oracleOperationId: string;
}

export interface IGatewayPersistenceConfig {
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  signer: JsObjectSigner;
  pubKey: string;
  logLevel?: LogLevelDesc;
  monitorService: MonitorService;
}

export class GatewayPersistence {
  public static readonly CLASS_NAME = "GatewayPersistence";
  private defaultRepository: boolean = true;
  public localRepository: ILocalLogRepository;
  public remoteRepository: IRemoteLogRepository | undefined;
  private signer: JsObjectSigner;
  private pubKey: string;
  private readonly log: Logger;
  private readonly monitorService: MonitorService;

  constructor(config: IGatewayPersistenceConfig) {
    this.localRepository = config.localRepository;
    this.remoteRepository = config.remoteRepository;
    this.signer = config.signer;
    this.pubKey = config.pubKey;
    this.monitorService = config.monitorService;

    this.log = LoggerProvider.getOrCreate(
      {
        label: "GatewayPersistence",
        level: config.logLevel || "INFO",
      },
      this.monitorService,
    );

    this.log.info("GatewayPersistence initialized.");
  }

  public getLocalRepository(): ILocalLogRepository {
    return this.localRepository;
  }

  public getRemoteRepository(): IRemoteLogRepository | undefined {
    return this.remoteRepository;
  }

  public async storeProof(
    logEntry: SATPGatewayLogEntryPersistence | OracleGatewayLogEntryPersistence,
  ): Promise<void> {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#storeProof()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        if ("sessionID" in logEntry) {
          this.log.info(
            `${fnTag} - Storing proof log entry for sessionID: ${logEntry.sessionID}`,
          );

          if (logEntry.data == undefined) {
            this.log.warn(`${fnTag} - No data provided in log entry.`);
            return;
          }

          const key = getSatpLogKey(
            logEntry.sessionID,
            logEntry.type,
            logEntry.operation,
          );
          const localLog: SATPLocalLog = {
            sessionId: logEntry.sessionID,
            type: logEntry.type,
            key: key,
            timestamp: Date.now().toString(),
            operation: logEntry.operation,
            data: logEntry.data,
            sequenceNumber: logEntry.sequenceNumber,
          };

          await this.storeInDatabase(localLog);

          const hash = SHA256(localLog.data ?? "").toString();

          this.log.debug(`${fnTag} - generated hash: ${hash}`);
          await this.storeRemoteLog(localLog.key, hash);
        } else {
          this.log.info(
            `${fnTag} - Storing proof log entry for taskId: ${logEntry.taskId}`,
          );

          if (logEntry.data == undefined) {
            this.log.warn(`${fnTag} - No data provided in log entry.`);
            return;
          }

          const key = getOracleLogKey(
            logEntry.taskId,
            logEntry.oracleOperationId ?? "",
            Date.now().toString(),
          );
          const localLog: OracleLocalLog = {
            taskId: logEntry.taskId,
            type: logEntry.type,
            key: key,
            timestamp: Date.now().toString(),
            operation: logEntry.operation,
            oracleOperationId: logEntry.oracleOperationId ?? "",
            data: logEntry.data,
          };

          await this.storeInDatabase(localLog);

          const hash = SHA256(localLog.data).toString();

          this.log.debug(`${fnTag} - generated hash: ${hash}`);
          await this.storeRemoteLog(localLog.key, hash);
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async persistLogEntry(
    logEntry: SATPGatewayLogEntryPersistence | OracleGatewayLogEntryPersistence,
  ): Promise<void> {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#persistLogEntry()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        if ("sessionID" in logEntry) {
          this.log.info(
            `${fnTag} - Persisting log entry for sessionID: ${logEntry.sessionID}`,
          );

          const key = getSatpLogKey(
            logEntry.sessionID,
            logEntry.type,
            logEntry.operation,
          );
          const localLog: SATPLocalLog = {
            sessionId: logEntry.sessionID,
            type: logEntry.type,
            key: key,
            timestamp: Date.now().toString(),
            operation: logEntry.operation,
            data: logEntry.data,
            sequenceNumber: logEntry.sequenceNumber,
          };

          await this.storeInDatabase(localLog);

          const hash = this.getSATPLocalLogHash(localLog);

          this.log.debug(`${fnTag} - generated hash: ${hash}`);
          await this.storeRemoteLog(localLog.key, hash);
        } else {
          this.log.info(
            `${fnTag} - Persisting log entry for taskId: ${logEntry.taskId}`,
          );

          const key = getOracleLogKey(
            logEntry.taskId,
            logEntry.oracleOperationId ?? "",
            Date.now().toString(),
          );
          const localLog: OracleLocalLog = {
            taskId: logEntry.taskId,
            type: logEntry.type,
            key: key,
            timestamp: Date.now().toString(),
            operation: logEntry.operation,
            oracleOperationId: logEntry.oracleOperationId ?? "",
            data: logEntry.data,
          };

          await this.storeInDatabase(localLog);

          const hash = this.getOracleLocalLogHash(localLog);

          this.log.debug(`${fnTag} - generated hash: ${hash}`);
          await this.storeRemoteLog(localLog.key, hash);
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private getSATPLocalLogHash(logEntry: SATPLocalLog): string {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#getSATPLocalLogHash()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag} - generating hash for log entry with sessionId: ${logEntry.sessionId}`,
        );

        return SHA256(
          safeStableStringify(logEntry, [
            "sessionId",
            "type",
            "key",
            "operation",
            "timestamp",
            "data",
            "sequenceNumber",
          ]),
        ).toString();
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private getOracleLocalLogHash(logEntry: OracleLocalLog): string {
    const fnTag = `GatewayLogger#getOracleLocalLogHash()`;
    this.log.debug(
      `${fnTag} - generating hash for log entry with taskID: ${logEntry.taskId}`,
    );

    return SHA256(
      safeStableStringify(logEntry, [
        "key",
        "type",
        "operation",
        "timestamp",
        "data",
        "taskID",
        "oracleOperationId",
      ]),
    ).toString();
  }

  private async storeInDatabase(localLog: Log): Promise<void> {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#storeInDatabase()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.info(`${fnTag} - Storing log entry with key: ${localLog.key}`);

        if (this.defaultRepository && !this.localRepository.getCreated()) {
          this.log.info(
            `${fnTag} - Default configuration detected. Creating local repository.`,
          );
          this.log.info(`${fnTag} - Local repository created.`);
        }

        await this.localRepository.create(localLog);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private async storeRemoteLog(key: string, hash: string): Promise<void> {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#storeRemoteLog()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        if (this.remoteRepository) {
          this.log.info(
            `${fnTag} - Storing remote log with key: ${key} and hash: ${hash}`,
          );

          const remoteLog: SATPRemoteLog = {
            key: key,
            hash: hash,
            signature: "",
            signerPubKey: this.pubKey,
          };

          remoteLog.signature = bufArray2HexStr(
            sign(this.signer, safeStableStringify(remoteLog)),
          );

          this.log.debug(
            `${fnTag} - Generated signature: ${remoteLog.signature}`,
          );
          const response = await this.remoteRepository.create(remoteLog);

          if (response.status < 200 || response.status > 299) {
            this.log.error(
              `${fnTag} - Failed to store remote log. Response status: ${response.status}`,
            );
            throw new Error(
              `${fnTag} - Got response ${response.status} when logging to remote`,
            );
          }

          this.log.info(`${fnTag} - Successfully stored remote log.`);
        }
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
