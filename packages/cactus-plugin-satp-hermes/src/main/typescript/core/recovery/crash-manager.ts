import {
  Logger,
  LoggerProvider,
  Checks,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { SessionData } from "../../generated/proto/cacti/satp/v02/common/session_pb";
import { CrashRecoveryHandler } from "./crash-recovery-handler";
import { SATPSession } from "../satp-session";
import {
  RollbackStrategy,
  RollbackStrategyFactory,
} from "./rollback/rollback-strategy-factory";
import { CrashRecoveryService } from "./crash-utils";
import { KnexLocalLogRepository as LocalLogRepository } from "../../repository/knex-local-log-repository";
import { ILocalLogRepository } from "../../repository/interfaces/repository";
import { Knex } from "knex";
import {
  RecoverMessage,
  RecoverSuccessMessage,
  RecoverUpdateMessage,
  RollbackState,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SessionType } from "../session-utils";
import { ISATPBridgesOptions } from "../../gol/satp-bridges-manager";

export enum CrashStatus {
  IN_RECOVERY = "IN_RECOVERY",
  RECOVERED = "RECOVERED",
  NO_CRASH = "NO_CRASH",
  ERROR = "ERROR",
}

class CrashOccurrence {
  constructor(
    public status: CrashStatus,
    public time: Date,
    public lastUpdate: Date,
  ) {}
}

export interface ICrashRecoveryManagerOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  knexConfig?: Knex.Config;
  bridgeConfig: ISATPBridgesOptions;
}

export class CrashRecoveryManager {
  public static readonly CLASS_NAME = "CrashRecoveryManager";
  private readonly log: Logger;
  private readonly instanceId: string;
  private sessions: Map<string, SessionData>;
  private crashRecoveryHandler: CrashRecoveryHandler;
  private factory: RollbackStrategyFactory;
  private logRepository: ILocalLogRepository;

  constructor(public readonly options: ICrashRecoveryManagerOptions) {
    const fnTag = `${CrashRecoveryManager.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "DEBUG";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.sessions = new Map<string, SessionData>();
    this.log.info(`Instantiated ${this.className} OK`);
    this.logRepository = new LocalLogRepository(options.knexConfig);
    this.factory = new RollbackStrategyFactory(
      options.bridgeConfig,
      this.logRepository,
    );
    const crashRecoveryServiceOptions = {
      logLevel: this.options.logLevel,
      instanceId: this.instanceId,
      loggerOptions: {
        label: "CrashRecoveryService",
        level: this.options.logLevel || "DEBUG",
      },
      logRepository: this.logRepository,
    };
    this.crashRecoveryHandler = new CrashRecoveryHandler({
      loggerOptions: {
        label: "CrashRecoveryHandler",
        level: "DEBUG",
      },
      crashService: new CrashRecoveryService(crashRecoveryServiceOptions),
      sessions: this.sessions,
      logRepository: this.logRepository,
    });
  }

  get className(): string {
    return CrashRecoveryManager.CLASS_NAME;
  }

  public async recoverSessions() {
    const fnTag = `${this.className}#recoverSessions()`;

    try {
      const allLogs = await this.logRepository.readLogsNotProofs();
      for (const log of allLogs) {
        const sessionId = log.sessionID;
        this.log.info(`${fnTag}, recovering session: ${sessionId}`);

        if (log == undefined || log.data == undefined) {
          throw new Error(`${fnTag}, invalid log}`);
        }

        try {
          const logEntry: SessionData = JSON.parse(log.data);
          this.sessions.set(sessionId, logEntry);
        } catch (error) {
          this.log.error(
            `Error parsing log data for session Id: ${sessionId}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.log.error(`Error initializing sessions: ${error}`);
    }
  }

  private async checkCrash(session: SATPSession): Promise<CrashStatus> {
    const fnTag = `${this.className}#checkCrash()`;
    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    try {
      session.verify(
        fnTag,
        session.hasClientSessionData()
          ? SessionType.CLIENT
          : SessionType.SERVER,
      );

      const lastLog = await this.logRepository.readLastestLog(
        session.getSessionId(),
      );

      if (lastLog && lastLog.operation !== "done") {
        this.log.debug(
          `${fnTag} Crash detected for session ID: ${session.getSessionId()} last log operation: ${lastLog.operation}`,
        );
        return CrashStatus.IN_RECOVERY;
      }

      const logTimestamp = new Date(lastLog?.timestamp ?? 0).getTime();
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - logTimestamp;

      if (timeDifference > Number(sessionData.maxTimeout)) {
        this.log.warn(
          `${fnTag} Timeout exceeded by ${timeDifference} ms for session ID: ${session.getSessionId()}`,
        );
        return CrashStatus.IN_RECOVERY;
      }

      this.log.info(
        `${fnTag} No crash detected for session ID: ${session.getSessionId()}`,
      );
      return CrashStatus.NO_CRASH;
    } catch (error) {
      this.log.error(`${fnTag} Error occured !`);
      return CrashStatus.ERROR;
    }
  }

  public async checkAndResolveCrash(session: SATPSession): Promise<void> {
    const fnTag = `${this.className}#checkAndResolveCrash()`;

    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    try {
      let attempts = 0;
      let crashOccurrence: CrashOccurrence | undefined;

      while (attempts < BigInt(sessionData.maxRetries)) {
        const crashStatus = await this.checkCrash(session);

        if (crashStatus === CrashStatus.IN_RECOVERY) {
          this.log.info(`${fnTag} Crash detected! Attempting recovery`);

          if (!crashOccurrence) {
            crashOccurrence = new CrashOccurrence(
              CrashStatus.IN_RECOVERY,
              new Date(),
              new Date(),
            );
          } else {
            crashOccurrence.lastUpdate = new Date();
          }

          const status = await this.handleRecovery(session);
          if (status) {
            crashOccurrence.status = CrashStatus.RECOVERED;
            this.log.info(
              `${fnTag} Recovery successful for sessionID: ${session.getSessionId()}`,
            );
            return;
          }
        }
        attempts++;
        this.log.info(
          `${fnTag} Retry attempt ${attempts} for sessionID: ${session.getSessionId()}`,
        );
      }
      if (attempts != 0) {
        this.log.warn(`${fnTag} All retries exhausted ! Initiating Rollback`);
        const rollBackStatus = await this.initiateRollback(session, true);
        if (rollBackStatus) {
          this.log.info(
            `${fnTag} rollback was success: ${session.getSessionId()}`,
          );
        } else {
          this.log.error(
            `${fnTag} rollback failed ! ${session.getSessionId()}`,
          );
        }
      }
    } catch (error) {
      this.log.error(`${fnTag} Error during crash resolution: ${error}`);
    }
  }

  public async handleRecovery(session: SATPSession): Promise<boolean> {
    const fnTag = `${this.className}#handleRecovery()`;

    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();
    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    try {
      this.log.info(
        `${fnTag} Initiating recovery for session ID: ${session.getSessionId()}`,
      );

      const recoverMessage = new RecoverMessage({
        sessionId: session.getSessionId(),
        messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
        satpPhase: "sessionData.hashes?.stage0", //todo: get phase info
        sequenceNumber: Number(sessionData.lastSequenceNumber),
        isBackup: false,
        newIdentityPublicKey: "",
        lastEntryTimestamp: sessionData.lastSequenceNumber,
        senderSignature: "",
      });

      const recoverUpdateMessage =
        await this.crashRecoveryHandler.handleRecover(recoverMessage);

      const response = await this.processRecoverUpdate(recoverUpdateMessage);

      if (response) {
        const recoverSuccessMessage = new RecoverSuccessMessage({
          sessionId: session.getSessionId(),
          messageType: "urn:ietf:SATP-2pc:msgtype:recover-success-msg",
          hashRecoverUpdateMessage: "",
          success: true,
          entriesChanged: [],
          senderSignature: "",
        });

        await this.crashRecoveryHandler.handleRecoverSuccess(
          recoverSuccessMessage,
        );

        this.log.info(
          `${fnTag} Recovery handled successfully for session ID: ${session.getSessionId()}`,
        );
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.log.error(
        `${fnTag} Error during recovery process for session ID: ${session.getSessionId()} - ${error}`,
      );
      throw new Error(
        `Recovery failed for session ID: ${session.getSessionId()}`,
      );
    }
  }

  private async processRecoverUpdate(
    message: RecoverUpdateMessage,
  ): Promise<boolean> {
    const fnTag = `${this.className}#processRecoverUpdate()`;
    try {
      const sessionId = message.sessionId;
      const recoveredLogs = message.recoveredLogs;

      if (!recoveredLogs || recoveredLogs.length === 0) {
        this.log.warn(`${fnTag} No recovered logs to process.`);
        return true;
      }

      for (const logEntry of recoveredLogs) {
        await this.logRepository.create(logEntry);
      }

      const allLogs = await this.logRepository.readLogsBySessionId(sessionId);

      if (!allLogs || allLogs.length === 0) {
        this.log.error(`${fnTag} No logs found for session ID: ${sessionId}`);
        return false;
      }

      let reconstructedSessionData = new SessionData();

      for (const logEntry of allLogs) {
        const data = JSON.parse(logEntry.data);
        reconstructedSessionData = data;
        this.sessions.set(sessionId, reconstructedSessionData);
      }

      this.log.info(
        `${fnTag} Session data successfully reconstructed for session ID: ${sessionId}`,
      );

      return true;
    } catch (error) {
      this.log.error(
        `${fnTag} Error processing RecoverUpdateMessage: ${error}`,
      );
      return false;
    }
  }

  public async initiateRollback(
    session: SATPSession,
    forceRollback?: boolean,
  ): Promise<boolean> {
    const fnTag = `CrashRecoveryManager#initiateRollback()`;

    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();
    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }
    this.log.info(
      `${fnTag} Initiating rollback for session ${session.getSessionId()}`,
    );

    try {
      if (forceRollback) {
        const strategy = this.factory.createStrategy(session);
        const rollbackState = await this.executeRollback(strategy, session);

        if (rollbackState) {
          const cleanupSuccess = await this.performCleanup(
            strategy,
            session,
            rollbackState,
          );
          return cleanupSuccess;
        } else {
          this.log.error(
            `${fnTag} Rollback execution failed for session ${session.getSessionId()}`,
          );
          return false;
        }
      } else {
        this.log.info(
          `${fnTag} Rollback not needed for session ${session.getSessionId()}`,
        );
        return true;
      }
    } catch (error) {
      this.log.error(`${fnTag} Error during rollback initiation: ${error}`);
      return false;
    }
  }

  private async executeRollback(
    strategy: RollbackStrategy,
    session: SATPSession,
  ): Promise<RollbackState | undefined> {
    const fnTag = `CrashRecoveryManager#executeRollback`;
    this.log.debug(
      `${fnTag} Executing rollback strategy for session ${session.getSessionId()}`,
    );

    try {
      return await strategy.execute(session);
    } catch (error) {
      this.log.error(`${fnTag} Error executing rollback strategy: ${error}`);
    }
  }

  private async performCleanup(
    strategy: RollbackStrategy,
    session: SATPSession,
    state: RollbackState,
  ): Promise<boolean> {
    const fnTag = `CrashRecoveryManager#performCleanup`;
    this.log.debug(
      `${fnTag} Performing cleanup after rollback for session ${session.getSessionId()}`,
    );

    try {
      const updatedState = await strategy.cleanup(session, state);

      // TODO: Handle the updated state, perhaps update session data or perform additional actions
      this.log.info(
        `${fnTag} Cleanup completed. Updated state: ${JSON.stringify(updatedState)}`,
      );

      return true;
    } catch (error) {
      this.log.error(`${fnTag} Error during cleanup: ${error}`);
      return false;
    }
  }
}
