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
  RollbackState,
  RollbackStrategy,
  RollbackStrategyFactory,
} from "./rollback/rollback-strategy-factory";
import { CrashRecoveryService } from "./crash-utils";
import { KnexLocalLogRepository as LocalLogRepository } from "../../repository/knex-local-log-repository";
import { ILocalLogRepository } from "../../repository/interfaces/repository";
import { Knex } from "knex";
import { SATPBridgeConfig, LocalLog } from "../types";
import { SessionType } from "../session-utils";

enum CrashStatus {
  IN_RECOVERY = "IN_RECOVERY",
  RECOVERED = "RECOVERED",
  NO_CRASH = "NO_CRASH",
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
  bridgeConfig: SATPBridgeConfig;
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
    this.factory = new RollbackStrategyFactory(options.bridgeConfig);
    this.logRepository = new LocalLogRepository(options.knexConfig);
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

  public async init(): Promise<void> {
    this.sessions = await this.getSessions();
  }

  // todo read from local log to get session data
  /*private async getSessions(): Map<string, SessionData> {
    const sessionMap = new Map<string, SessionData>();
    try {
      const allSessions = await this.logRepository.readLogsNotProofs();
      allSessions.forEach((log) => {
        const sessionData = new SessionData();
        sessionData.id = log.sessionID;

        sessionMap.set(log.sessionID, sessionData);
      });
    } catch (error) {
      this.log.error(`Error initializing sessions: ${error}`);
    }

    return sessionMap;
  }*/

  private async getSessions(): Promise<Map<string, SessionData>> {
    const sessionMap = new Map<string, SessionData>();

    try {
      const allLogs = await this.logRepository.readLogsNotProofs();

      for (const log of allLogs) {
        const sessionId = log.sessionID;

        let sessionData = sessionMap.get(sessionId);
        if (!sessionData) {
          sessionData = new SessionData();
          sessionData.id = sessionId;
          sessionMap.set(sessionId, sessionData);
        }

        try {
          const logEntry = JSON.parse(log.data);

          Object.assign(sessionData, logEntry);

          if (logEntry.sequenceNumber !== undefined) {
            sessionData.lastSequenceNumber = logEntry.sequenceNumber;
          }
        } catch (error) {
          this.log.error(
            `Error parsing log data for session ${sessionId}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.log.error(`Error initializing sessions: ${error}`);
    }

    return sessionMap;
  }

  // todo create util functoin that retrieves sessionid and checks if it is valid; i believe it is implemented in the satp services, refactor making it reusable
  private async checkCrash(session: SATPSession): Promise<CrashStatus> {
    // todo implement crash check - check logs and understsands if there was a crash; might use timouts, etc

    const fnTag = `${this.className}#checkCrash()`;

    // check the logs and from the timeout logic make out
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
      if (lastLog && lastLog.operation !== "COMPLETED") {
        this.log.debug(
          `${fnTag} Crash detected for session ${session.getSessionId()}`,
        );
        return CrashStatus.IN_RECOVERY;
      }

      const sessionData = session.hasClientSessionData()
        ? session.getClientSessionData()
        : session.getServerSessionData();

      const logTimestamp = Number(lastLog.timestamp);
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - logTimestamp;

      if (timeDifference > Number(sessionData.maxTimeout)) {
        this.log.warn(
          `${fnTag} Timeout exceeded for session ID: ${session.getSessionId()}`,
        );
        return CrashStatus.IN_RECOVERY;
      }

      this.log.info(
        `${fnTag} No crash detected for session ID: ${session.getSessionId()}`,
      );
      return CrashStatus.NO_CRASH;
    } catch (error) {
      this.log.error(`${fnTag} Error detecting crash: ${error}`);
      return CrashStatus.NO_CRASH;
    }
  }

  public async checkAndResolveCrash(sessionId: SATPSession): Promise<boolean> {
    const fnTag = `${this.className}#checkAndResolveCrash()`;
    this.log.info(`${fnTag} Checking crash status for session ${sessionId}`);

    try {
      const sessionData = sessionId.hasClientSessionData()
        ? sessionId.getClientSessionData()
        : sessionId.getServerSessionData();

      if (!sessionData) {
        throw new Error(`${fnTag}, session data is not correctly initialized`);
      }

      let attempts = 0;
      let crashOccurrence: CrashOccurrence | undefined;

      while (attempts < BigInt(sessionData.maxRetries)) {
        const crashStatus = await this.checkCrash(sessionId);

        if (crashStatus === CrashStatus.IN_RECOVERY) {
          this.log.info(
            `${fnTag} Crash detected. Attempting recovery for session ${sessionId}`,
          );

          if (!crashOccurrence) {
            crashOccurrence = new CrashOccurrence(
              CrashStatus.IN_RECOVERY,
              new Date(),
              new Date(),
            );
          } else {
            crashOccurrence.lastUpdate = new Date();
          }

          await this.handleRecovery(sessionId);
          this.log.info(`${fnTag} Recovery successful.`);

          crashOccurrence.status = CrashStatus.RECOVERED;

          return true;
        }
        attempts++;
        this.log.info(
          `${fnTag} Retry attempt ${attempts} for session ${sessionId}`,
        );
      }

      this.log.warn(`${fnTag} All retries exhausted. Initiating rollback.`);
      await this.initiateRollback(sessionId, true);
      return false;
    } catch (error) {
      this.log.error(`${fnTag} Error during crash resolution: ${error}`);
      return false;
    }
  }

  public async handleRecovery(session: SATPSession): Promise<void> {
    const fnTag = `${this.className}#handleRecovery()`;

    try {
      if (session.hasServerSessionData()) {
        this.log.info(
          `${fnTag} Initiating recovery as a server for session ID: ${session.getSessionId()}`,
        );
      } else if (session.hasClientSessionData()) {
        this.log.info(
          `${fnTag} Initiating recovery as a client for session ID: ${session.getSessionId()}`,
        );
      } else {
        throw new Error(
          `${fnTag} Neither client nor server session data is available for session ID: ${session.getSessionId()}`,
        );
      }

      const recoverMessage =
        await this.crashRecoveryHandler.sendRecover(session);
      const recoverUpdateMessage =
        await this.crashRecoveryHandler.sendRecoverUpdate(recoverMessage);
      await this.crashRecoveryHandler.sendRecoverSuccess(recoverUpdateMessage);

      this.log.info(
        `${fnTag} Recovery handled successfully for session ID: ${session.getSessionId()}`,
      );
    } catch (error) {
      this.log.error(
        `${fnTag} Error during recovery process for session ID: ${session.getSessionId()} - ${error}`,
      );
      throw new Error(
        `Recovery failed for session ID: ${session.getSessionId()}`,
      );
    }
  }

  public async initiateRollback(
    session: SATPSession,
    forceRollback?: boolean,
  ): Promise<boolean> {
    const fnTag = `CrashRecoveryManager#initiateRollback()`;
    this.log.info(
      `${fnTag} Initiating rollback for session ${session.getSessionId()}`,
    );

    try {
      // Implement check for rollback (needs to read logs, etc) OR we assume that at satp handler/service layer this check is done and rollback is good to do

      const sessionLog: LocalLog = await this.logRepository.readLastestLog(
        session.getSessionId(),
      );

      let shouldRollback = false;
      if (sessionLog.operation !== "COMPLETED") {
        shouldRollback = true;
      }

      if (forceRollback || shouldRollback) {
        // send bridge manager and possibly others to factory
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
