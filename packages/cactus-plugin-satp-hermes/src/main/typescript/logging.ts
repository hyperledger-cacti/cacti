import { Log, OracleLocalLog, SATPLocalLog, SATPRemoteLog } from "./core/types";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./database/repository/interfaces/repository";
import {
  JsObjectSigner,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { SHA256 } from "crypto-js";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  bufArray2HexStr,
  getOracleLogKey,
  getSatpLogKey,
  sign,
} from "./gateway-utils";

export interface IGatewayLoggerConfig {
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  signer: JsObjectSigner;
  pubKey: string;
  logLevel?: LogLevelDesc;
}

// Alias for backward compatibility
export interface ISATPLoggerConfig extends IGatewayLoggerConfig {}

export class GatewayLogger {
  private defaultRepository: boolean = true;
  public localRepository: ILocalLogRepository;
  public remoteRepository: IRemoteLogRepository | undefined;
  private signer: JsObjectSigner;
  private pubKey: string;
  private readonly log: Logger;

  constructor(config: IGatewayLoggerConfig) {
    this.localRepository = config.localRepository;
    this.remoteRepository = config.remoteRepository;
    this.signer = config.signer;
    this.pubKey = config.pubKey;

    this.log = LoggerProvider.getOrCreate({
      label: "GatewayLogger",
      level: config.logLevel || "INFO",
    });

    this.log.info("GatewayLogger initialized.");
  }

  public async storeProof(
    logEntry:
      | (Partial<SATPLocalLog> & {
          sessionID: string;
          type: string;
          operation: string;
          data: string;
          sequenceNumber?: number;
          key?: string;
        })
      | (Partial<OracleLocalLog> & {
          taskID: string;
          type: string;
          operation: string;
          data: string;
          key?: string;
        }),
  ): Promise<void> {
    const fnTag = `GatewayLogger#storeProof()`;

    let localLog: SATPLocalLog | OracleLocalLog;
    let hash: string;

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
      localLog = {
        sessionID: logEntry.sessionID,
        type: logEntry.type,
        key: key,
        timestamp: Date.now().toString(),
        operation: logEntry.operation,
        data: logEntry.data,
        sequenceNumber: logEntry.sequenceNumber ?? 0,
      };

      hash = this.getSATPLocalLogHash(localLog);
    } else {
      this.log.info(
        `${fnTag} - Storing proof log entry for taskID: ${logEntry.taskID}`,
      );

      if (logEntry.data == undefined) {
        this.log.warn(`${fnTag} - No data provided in log entry.`);
        return;
      }

      const key = getOracleLogKey(
        logEntry.taskID,
        logEntry.oracleOperationId ?? "",
        logEntry.timestamp ?? Date.now().toString(),
      );
      localLog = {
        taskID: logEntry.taskID,
        type: logEntry.type,
        key: key,
        timestamp: Date.now().toString(),
        operation: logEntry.operation,
        oracleOperationId: logEntry.oracleOperationId ?? "",
        data: logEntry.data,
      };
      hash = this.getOracleLocalLogHash(localLog);
    }

    await this.storeInDatabase(localLog);

    this.log.debug(`${fnTag} - generated hash: ${hash}`);
    await this.storeRemoteLog(localLog.key, hash);
  }

  public async persistLogEntry(
    logEntry:
      | (Partial<SATPLocalLog> & {
          sessionID: string;
          type: string;
          operation: string;
          data: string;
          sequenceNumber?: number;
          key?: string;
        })
      | (Partial<OracleLocalLog> & {
          taskID: string;
          type: string;
          operation: string;
          data: string;
          key?: string;
        }),
  ): Promise<void> {
    const fnTag = `GatewayLogger#persistLogEntry()`;

    let localLog: SATPLocalLog | OracleLocalLog;
    let hash: string;

    if ("sessionID" in logEntry) {
      this.log.info(
        `${fnTag} - Persisting log entry for sessionID: ${logEntry.sessionID}`,
      );

      const key = getSatpLogKey(
        logEntry.sessionID,
        logEntry.type,
        logEntry.operation,
      );
      localLog = {
        sessionID: logEntry.sessionID,
        type: logEntry.type,
        key: key,
        timestamp: Date.now().toString(),
        operation: logEntry.operation,
        data: logEntry.data,
        sequenceNumber: logEntry.sequenceNumber ?? 0,
      };

      hash = this.getSATPLocalLogHash(localLog);
    } else {
      this.log.info(
        `${fnTag} - Persisting log entry for taskID: ${logEntry.taskID}`,
      );

      const key = getOracleLogKey(
        logEntry.taskID,
        logEntry.oracleOperationId ?? "",
        logEntry.timestamp ?? Date.now().toString(),
      );
      localLog = {
        taskID: logEntry.taskID,
        key: key,
        type: logEntry.type,
        timestamp: Date.now().toString(),
        operation: logEntry.operation,
        oracleOperationId: logEntry.oracleOperationId ?? "",
        data: logEntry.data,
      };

      hash = this.getOracleLocalLogHash(localLog);
    }

    await this.storeInDatabase(localLog);

    this.log.debug(`${fnTag} - generated hash: ${hash}`);
    await this.storeRemoteLog(localLog.key, hash);
  }

  private getSATPLocalLogHash(logEntry: SATPLocalLog): string {
    const fnTag = `GatewayLogger#getSATPLocalLogHash()`;
    this.log.debug(
      `${fnTag} - generating hash for log entry with sessionID: ${logEntry.sessionID}`,
    );

    return SHA256(
      safeStableStringify(logEntry, [
        "key",
        "type",
        "operation",
        "timestamp",
        "data",
        "sessionID",
        "sequenceNumber",
      ]),
    ).toString();
  }

  private getOracleLocalLogHash(logEntry: OracleLocalLog): string {
    const fnTag = `GatewayLogger#getOracleLocalLogHash()`;
    this.log.debug(
      `${fnTag} - generating hash for log entry with taskID: ${logEntry.taskID}`,
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
    const fnTag = `GatewayLogger#storeInDatabase()`;
    this.log.info(`${fnTag} - Storing log entry with key: ${localLog.key}`);

    if (this.defaultRepository && !this.localRepository.getCreated()) {
      this.log.info(
        `${fnTag} - Default configuration detected. Creating local repository.`,
      );
      this.log.info(`${fnTag} - Local repository created.`);
    }

    await this.localRepository.create(localLog);
  }

  private async storeRemoteLog(key: string, hash: string): Promise<void> {
    const fnTag = `GatewayLogger#storeRemoteLog()`;
    if (!!this.remoteRepository) {
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

      this.log.debug(`${fnTag} - Generated signature: ${remoteLog.signature}`);
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
  }
}
