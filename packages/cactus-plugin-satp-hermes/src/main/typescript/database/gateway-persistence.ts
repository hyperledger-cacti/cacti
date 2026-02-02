import { AuditEntry, LocalLog, RemoteLog } from "../core/types";
import {
  IAuditEntryRepository,
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./repository/interfaces/repository";
import { JsObjectSigner, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLogger as Logger } from "../core/satp-logger";
import { SATPLoggerProvider as LoggerProvider } from "../core/satp-logger-provider";
import { SHA256 } from "crypto-js";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { bufArray2HexStr, getSatpLogKey, sign } from "../utils/gateway-utils";
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

interface GatewayLogEntryPersistence {
  sessionId: string;
  type: string;
  operation: string;
  data: string;
  sequenceNumber: number;
}

export interface IGatewayPersistenceConfig {
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  auditRepository: IAuditEntryRepository;
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
  public auditRepository: IAuditEntryRepository;
  private signer: JsObjectSigner;
  private pubKey: string;
  private readonly log: Logger;
  private readonly monitorService: MonitorService;

  constructor(config: IGatewayPersistenceConfig) {
    this.localRepository = config.localRepository;
    this.remoteRepository = config.remoteRepository;
    this.auditRepository = config.auditRepository;
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

  public getAuditRepository(): IAuditEntryRepository {
    return this.auditRepository;
  }

  public async storeProof(logEntry: GatewayLogEntryPersistence): Promise<void> {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#storeProof()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.info(
          `${fnTag} - Storing proof log entry for sessionId: ${logEntry.sessionId}`,
        );

        if (logEntry.data == undefined) {
          this.log.warn(`${fnTag} - No data provided in log entry.`);
          return;
        }

        const key = getSatpLogKey(
          logEntry.sessionId,
          logEntry.type,
          logEntry.operation,
        );
        const localLog: LocalLog = {
          sessionId: logEntry.sessionId,
          type: logEntry.type,
          key: key,
          timestamp: Date.now().toString(),
          operation: logEntry.operation,
          data: logEntry.data,
          sequenceNumber: logEntry.sequenceNumber,
        };

        const auditEntry: AuditEntry = {
          auditEntryId: `audit-${Date.now()}-${logEntry.sessionId}`,
          session: localLog,
          timestamp: Date.now().toString(),
        };

        await this.storeInDatabase(localLog, auditEntry);

        const hash = SHA256(localLog.data).toString();

        this.log.debug(`${fnTag} - generated hash: ${hash}`);
        await this.storeRemoteLog(localLog.key, hash);
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
    logEntry: GatewayLogEntryPersistence,
  ): Promise<void> {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#persistLogEntry()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.info(
          `${fnTag} - Persisting log entry for sessionId: ${logEntry.sessionId}`,
        );

        const key = getSatpLogKey(
          logEntry.sessionId,
          logEntry.type,
          logEntry.operation,
        );
        const localLog: LocalLog = {
          sessionId: logEntry.sessionId,
          type: logEntry.type,
          key: key,
          timestamp: Date.now().toString(),
          operation: logEntry.operation,
          data: logEntry.data,
          sequenceNumber: logEntry.sequenceNumber,
        };

        //TODO: AuditEntry population
        await this.storeInDatabase(localLog, {} as AuditEntry);

        const hash = this.getHash(localLog);

        this.log.debug(`${fnTag} - generated hash: ${hash}`);
        await this.storeRemoteLog(localLog.key, hash);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private getHash(logEntry: LocalLog): string {
    const fnTag = `${GatewayPersistence.CLASS_NAME}#getHash()`;
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

  private async storeInDatabase(
    localLog: LocalLog,
    auditEntry: AuditEntry,
  ): Promise<void> {
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
        await this.auditRepository.create(auditEntry);
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

          const remoteLog: RemoteLog = {
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
