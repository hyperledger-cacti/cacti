import { RemoteLog, OracleLocalLog } from "./core/types";
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
import { bufArray2HexStr, getSatpLogKey, sign } from "./gateway-utils";

export interface IOracleOperationLogEntry {
  oracleTaskId: string;
  operationId: string;
  type: string; // e.g., "oracle-read", "oracle-update"
  status: string; // e.g., "init", "exec", "done", "fail"
  data: string; // Stringified representation of relevant data (e.g., operation, response, error)
  timestamp: number; // Unix timestamp
}

export interface IGatewayLoggerConfig {
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  signer: JsObjectSigner;
  pubKey: string;
  logLevel?: LogLevelDesc;
}

export class GatewayLogger {
  public static readonly CLASS_NAME = "GatewayLogger";

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

  public async storeProof(logEntry: IOracleOperationLogEntry): Promise<void> {
    const fnTag = `GatewayLogger#storeProof()`;
    this.log.info(
      `${fnTag} - Storing proof log entry for oracleTaskId: ${logEntry.oracleTaskId}`,
    );

    if (logEntry.data == undefined) {
      this.log.warn(`${fnTag} - No data provided in log entry.`);
      return;
    }

    const key = getSatpLogKey(
      logEntry.oracleTaskId,
      logEntry.type,
      logEntry.status,
    );
    const localLog: OracleLocalLog = {
      oracleTaskId: logEntry.oracleTaskId,
      operationId: logEntry.operationId,
      type: logEntry.type,
      key: key,
      status: logEntry.status,
      data: logEntry.data,
      timestamp: logEntry.timestamp,
    };

    await this.storeInDatabase(localLog);

    const hash = SHA256(localLog.data).toString();

    this.log.debug(`${fnTag} - generated hash: ${hash}`);
    await this.storeRemoteLog(localLog.key, hash);
  }

  public async persistLogEntry(
    logEntry: IOracleOperationLogEntry,
  ): Promise<void> {
    const fnTag = `GatewayLogger#persistLogEntry()`;
    this.log.info(
      `${fnTag} - Persisting log entry for oracleTaskId: ${logEntry.oracleTaskId}`,
    );

    const key = getSatpLogKey(
      logEntry.oracleTaskId,
      logEntry.type,
      logEntry.status,
    );
    const localLog: OracleLocalLog = {
      oracleTaskId: logEntry.oracleTaskId,
      operationId: logEntry.operationId,
      type: logEntry.type,
      key: key,
      status: logEntry.status,
      data: logEntry.data,
      timestamp: logEntry.timestamp,
    };

    await this.storeInDatabase(localLog);

    const hash = this.getHash(localLog);

    this.log.debug(`${fnTag} - generated hash: ${hash}`);
    await this.storeRemoteLog(localLog.key, hash);
  }

  private getHash(logEntry: OracleLocalLog): string {
    const fnTag = `GatewayLogger#getHash()`;
    this.log.debug(
      `${fnTag} - generating hash for log entry with sessionID: ${logEntry.oracleTaskId}`,
    );

    return SHA256(
      safeStableStringify(logEntry, [
        "oracleTaskId",
        "operationId",
        "type",
        "key",
        "status",
        "data",
        "timestamp",
      ]),
    ).toString();
  }

  private async storeInDatabase(localLog: OracleLocalLog): Promise<void> {
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

      const remoteLog: RemoteLog = {
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
