import { LocalLog, RemoteLog } from "./core/types";
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

interface SATPLogEntry {
  sessionID: string;
  type: string;
  operation: string;
  data: string;
  sequenceNumber: number;
}

export interface ISATPLoggerConfig {
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  signer: JsObjectSigner;
  pubKey: string;
  logLevel?: LogLevelDesc;
}

export class SATPLogger {
  private defaultRepository: boolean = true;
  public localRepository: ILocalLogRepository;
  public remoteRepository: IRemoteLogRepository | undefined;
  private signer: JsObjectSigner;
  private pubKey: string;
  private readonly log: Logger;

  constructor(config: ISATPLoggerConfig) {
    this.localRepository = config.localRepository;
    this.remoteRepository = config.remoteRepository;
    this.signer = config.signer;
    this.pubKey = config.pubKey;

    this.log = LoggerProvider.getOrCreate({
      label: "SATPLogger",
      level: config.logLevel || "INFO",
    });

    this.log.info("SATPLogger initialized.");
  }

  public async storeProof(logEntry: SATPLogEntry): Promise<void> {
    const fnTag = `SATPLogger#storeProof()`;
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
    const localLog: LocalLog = {
      sessionId: logEntry.sessionID,
      type: logEntry.type,
      key: key,
      timestamp: Date.now().toString(),
      operation: logEntry.operation,
      data: logEntry.data,
      sequenceNumber: logEntry.sequenceNumber,
    };

    await this.storeInDatabase(localLog);

    const hash = SHA256(localLog.data).toString();

    this.log.debug(`${fnTag} - generated hash: ${hash}`);
    await this.storeRemoteLog(localLog.key, hash);
  }

  public async persistLogEntry(logEntry: SATPLogEntry): Promise<void> {
    const fnTag = `SATPLogger#persistLogEntry()`;
    this.log.info(
      `${fnTag} - Persisting log entry for sessionID: ${logEntry.sessionID}`,
    );

    const key = getSatpLogKey(
      logEntry.sessionID,
      logEntry.type,
      logEntry.operation,
    );
    const localLog: LocalLog = {
      sessionId: logEntry.sessionID,
      type: logEntry.type,
      key: key,
      timestamp: Date.now().toString(),
      operation: logEntry.operation,
      data: logEntry.data,
      sequenceNumber: logEntry.sequenceNumber,
    };

    await this.storeInDatabase(localLog);

    const hash = this.getHash(localLog);

    this.log.debug(`${fnTag} - generated hash: ${hash}`);
    await this.storeRemoteLog(localLog.key, hash);
  }

  private getHash(logEntry: LocalLog): string {
    const fnTag = `SATPLogger#getHash()`;
    this.log.debug(
      `${fnTag} - generating hash for log entry with sessionID: ${logEntry.sessionId}`,
    );

    return SHA256(
      safeStableStringify(logEntry, [
        "sessionID",
        "type",
        "key",
        "operation",
        "timestamp",
        "data",
        "sequenceNumber",
      ]),
    ).toString();
  }

  private async storeInDatabase(localLog: LocalLog): Promise<void> {
    const fnTag = `SATPLogger#storeInDatabase()`;
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
    const fnTag = `SATPLogger#storeRemoteLog()`;
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
