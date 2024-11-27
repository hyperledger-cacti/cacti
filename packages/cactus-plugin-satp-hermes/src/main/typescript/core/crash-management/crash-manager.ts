import {
  Logger,
  LoggerProvider,
  Checks,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { SessionData } from "../../generated/proto/cacti/satp/v02/common/session_pb";
import { CrashRecoveryHandler } from "./crash-handler";
import { SATPSession } from "../satp-session";
import {
  RollbackStrategy,
  RollbackStrategyFactory,
} from "./rollback/rollback-strategy-factory";
import { KnexLocalLogRepository as LocalLogRepository } from "../../repository/knex-local-log-repository";
import { ILocalLogRepository } from "../../repository/interfaces/repository";
import { Knex } from "knex";
import {
  RecoverUpdateMessage,
  RollbackState,
  RollbackAckMessage,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SessionType } from "../session-utils";
import { SATPBridgesManager } from "../../gol/satp-bridges-manager";
import cron, { ScheduledTask } from "node-cron";
import { CrashRecoveryServerService } from "./server-service";
import { CrashRecoveryClientService } from "./client-service";
import { GatewayOrchestrator } from "../../gol/gateway-orchestrator";
import { PromiseClient as PromiseConnectClient } from "@connectrpc/connect";
import { GatewayIdentity, SupportedChain } from "../types";
import { CrashRecovery } from "../../generated/proto/cacti/satp/v02/crash_recovery_connect";

export enum CrashStatus {
  IN_RECOVERY = "IN_RECOVERY",
  RECOVERED = "RECOVERED",
  NO_CRASH = "NO_CRASH",
  ROLLBACK = "ROLLBACK_REQUIRED",
  ERROR = "ERROR",
}

/*class CrashOccurrence {
  constructor(
    public status: CrashStatus,
    public time: Date,
    public lastUpdate: Date,
  ) {}
}*/

export interface ICrashRecoveryManagerOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  knexConfig?: Knex.Config;
  bridgeConfig: SATPBridgesManager;
  orchestrator: GatewayOrchestrator;
}

export class CrashRecoveryManager {
  public static readonly CLASS_NAME = "CrashRecoveryManager";
  private readonly log: Logger;
  private readonly instanceId: string;
  private sessions: Map<string, SATPSession>;
  private crashRecoveryHandler: CrashRecoveryHandler;
  private factory: RollbackStrategyFactory;
  public logRepository: ILocalLogRepository;
  private crashDetectionTask!: ScheduledTask;
  private crashRecoveryServerService: CrashRecoveryServerService;
  private crashRecoveryClientService: CrashRecoveryClientService;
  private orchestrator: GatewayOrchestrator;
  private gatewaysPubKeys: Map<string, string> = new Map();
  private readonly bridgesManager: SATPBridgesManager;

  constructor(public readonly options: ICrashRecoveryManagerOptions) {
    const fnTag = `${CrashRecoveryManager.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "DEBUG";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.sessions = new Map<string, SATPSession>();
    this.log.info(`Instantiated ${this.className} OK`);
    this.logRepository = new LocalLogRepository(options.knexConfig);
    this.orchestrator = options.orchestrator;
    this.bridgesManager = options.bridgeConfig;
    this.loadPubKeys(this.orchestrator.getCounterPartyGateways());
    this.factory = new RollbackStrategyFactory(
      this.bridgesManager,
      this.logRepository,
    );
    this.crashRecoveryServerService = new CrashRecoveryServerService(
      this.logRepository,
      this.sessions,
    );

    this.crashRecoveryClientService = new CrashRecoveryClientService();

    this.crashRecoveryHandler = new CrashRecoveryHandler(
      this.crashRecoveryServerService,
      this.crashRecoveryClientService,
    );
    this.crashRecoveryHandler = new CrashRecoveryHandler(
      this.crashRecoveryServerService,
      this.crashRecoveryClientService,
    );
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

        if (!log || !log.data) {
          throw new Error(`${fnTag}, invalid log`);
        }

        try {
          const sessionData: SessionData = JSON.parse(log.data);
          const satpSession = SATPSession.fromSessionData(sessionData);
          this.sessions.set(sessionId, satpSession);
        } catch (error) {
          this.log.error(
            `Error parsing log data for session Id: ${sessionId}: ${error}`,
          );
        }
      }
      this.detectCrash();
    } catch (error) {
      this.log.error(`Error initializing sessions: ${error}`);
    }
  }

  private detectCrash() {
    const fnTag = `${this.className}#detectCrash()`;

    if (this.sessions.size === 0) {
      this.log.warn(
        `${fnTag} No active sessions. skipping cron job scheduling.`,
      );
      return;
    }

    this.crashDetectionTask = cron.schedule("*/15 * * * * *", async () => {
      this.log.debug(`${fnTag} Running crash detection cron job.`);
      await this.checkAndResolveCrashes();

      // stop the cron job if all sessions are resolved
      if (this.sessions.size === 0) {
        this.log.info(`${fnTag} all sessions resolved. Stopping cron job.`);
        this.stopCrashDetection();
      }
    });

    this.log.info(`${fnTag} crash detection cron job scheduled.`);
  }

  public stopCrashDetection() {
    if (this.crashDetectionTask) {
      this.crashDetectionTask.stop();
      this.log.info(`${this.className}#stopCrashDetection() Cron job stopped.`);
    }
  }

  public async checkAndResolveCrashes(): Promise<void> {
    const fnTag = `${this.className}#checkAndResolveCrashes()`;

    for (const [sessionId, session] of this.sessions.entries()) {
      await this.checkAndResolveCrash(session);

      const sessionData = session.hasClientSessionData()
        ? session.getClientSessionData()
        : session.getServerSessionData();

      // remove resolved sessions
      if (sessionData?.completed) {
        this.sessions.delete(sessionId);
        this.log.info(`${fnTag} session ${sessionId} resolved and removed.`);
      }
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
      const maxRetries = Number(sessionData.maxRetries);

      while (attempts < maxRetries) {
        const crashStatus = await this.checkCrash(session);

        if (crashStatus === CrashStatus.IN_RECOVERY) {
          this.log.info(`${fnTag} Crash detected! Attempting recovery`);

          const recoverySuccess = await this.handleRecovery(session);
          if (recoverySuccess) {
            this.log.info(
              `${fnTag} Recovery successful for sessionID: ${session.getSessionId()}`,
            );
            return;
          } else {
            attempts++;
            this.log.info(
              `${fnTag} Recovery attempt ${attempts} failed for sessionID: ${session.getSessionId()}`,
            );
          }
        } else if (crashStatus === CrashStatus.ROLLBACK) {
          this.log.warn(
            `${fnTag} Crash requires rollback. Initiating rollback.`,
          );
          await this.initiateRollback(session, true);
          return; // Exit after rollback
        } else if (crashStatus === CrashStatus.NO_CRASH) {
          this.log.info(
            `${fnTag} No crash detected for session ID: ${session.getSessionId()}`,
          );
          return; // Exit if no crash
        } else {
          this.log.warn(`${fnTag} Unexpected crash status: ${crashStatus}`);
          return;
        }
      }

      this.log.warn(
        `${fnTag} All recovery attempts exhausted. Initiating rollback.`,
      );
      await this.initiateRollback(session, true);
    } catch (error) {
      this.log.error(`${fnTag} Error during crash resolution: ${error}`);
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
          `${fnTag} Crash detected for session ID: ${session.getSessionId()}, last log operation: ${lastLog.operation}`,
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
        return CrashStatus.ROLLBACK;
      }

      return CrashStatus.NO_CRASH;
    } catch (error) {
      this.log.error(`${fnTag} Error occurred during crash check: ${error}`);
      return CrashStatus.ERROR;
    }
  }

  public async handleRecovery(session: SATPSession): Promise<boolean> {
    const fnTag = `${this.className}#handleRecovery()`;
    this.log.debug(
      `${fnTag} - Starting crash recovery for sessionId: ${session.getSessionId()}`,
    );

    try {
      const channel = this.orchestrator.getChannel(
        session.getClientSessionData()
          .recipientGatewayNetworkId as SupportedChain,
      );

      if (!channel) {
        throw new Error(
          `${fnTag} - Channel not found for the recipient gateway network ID.`,
        );
      }

      const counterGatewayID = this.orchestrator.getGatewayIdentity(
        channel.toGatewayID,
      );
      if (!counterGatewayID) {
        throw new Error(`${fnTag} - Counterparty gateway ID not found.`);
      }

      const clientCrashRecovery: PromiseConnectClient<typeof CrashRecovery> =
        channel.clients.get("4") as PromiseConnectClient<typeof CrashRecovery>;

      if (!clientCrashRecovery) {
        throw new Error(`${fnTag} - Failed to get clientCrashRecovery.`);
      }

      const recoverMessage =
        await this.crashRecoveryHandler.createRecoverMessage(session);

      const recoverUpdateMessage =
        await clientCrashRecovery.recoverV2Message(recoverMessage);

      this.log.info(
        `${fnTag} - Received RecoverUpdateMessage: ${JSON.stringify(recoverUpdateMessage)}`,
      );

      await this.processRecoverUpdateMessage(recoverUpdateMessage);

      const recoverSuccessMessage =
        await this.crashRecoveryHandler.createRecoverSuccessMessage(session);

      await clientCrashRecovery.recoverV2SuccessMessage(recoverSuccessMessage);

      this.log.info(
        `${fnTag} - Crash recovery completed for sessionId: ${session.getSessionId()}`,
      );

      return true;
    } catch (error) {
      this.log.error(
        `${fnTag} Error during recovery process for session ID: ${session.getSessionId()} - ${error}`,
      );
      throw new Error(
        `Recovery failed for session ID: ${session.getSessionId()}`,
      );
    }
  }

  private async processRecoverUpdateMessage(
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

      for (const log of recoveredLogs) {
        const sessionId = log.sessionID;
        this.log.info(`${fnTag}, recovering session: ${sessionId}`);

        if (!log || !log.data) {
          throw new Error(`${fnTag}, invalid log`);
        }

        try {
          const sessionData: SessionData = JSON.parse(log.data);
          const satpSession = SATPSession.fromSessionData(sessionData);
          this.sessions.set(sessionId, satpSession);
        } catch (error) {
          this.log.error(
            `Error parsing log data for session Id: ${sessionId}: ${error}`,
          );
        }
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

          const rollbackSuccess = await this.sendRollbackMessage(
            session,
            rollbackState,
          );
          return cleanupSuccess && rollbackSuccess;
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
      return undefined;
    }
  }

  private async sendRollbackMessage(
    session: SATPSession,
    rollbackState: RollbackState,
  ): Promise<boolean> {
    const fnTag = `${this.className}#sendRollbackMessage()`;
    this.log.debug(
      `${fnTag} - Starting to send RollbackMessage for sessionId: ${session.getSessionId()}`,
    );

    try {
      const channel = this.orchestrator.getChannel(
        session.getClientSessionData()
          .recipientGatewayNetworkId as SupportedChain,
      );

      if (!channel) {
        throw new Error(
          `${fnTag} - Channel not found for the recipient gateway network ID.`,
        );
      }

      const counterGatewayID = this.orchestrator.getGatewayIdentity(
        channel.toGatewayID,
      );
      if (!counterGatewayID) {
        throw new Error(`${fnTag} - Counterparty gateway ID not found.`);
      }

      const clientCrashRecovery: PromiseConnectClient<typeof CrashRecovery> =
        channel.clients.get("4") as PromiseConnectClient<typeof CrashRecovery>;

      if (!clientCrashRecovery) {
        throw new Error(`${fnTag} - Failed to get clientCrashRecovery.`);
      }

      const rollbackMessage =
        await this.crashRecoveryHandler.createRollbackMessage(
          session,
          rollbackState,
        );

      const rollbackAckMessage =
        await clientCrashRecovery.rollbackV2Message(rollbackMessage);

      this.log.info(
        `${fnTag} - Received RollbackAckMessage: ${JSON.stringify(rollbackAckMessage)}`,
      );

      const success = await this.processRollbackAckMessage(rollbackAckMessage);

      return success;
    } catch (error) {
      this.log.error(
        `${fnTag} Error during rollback message sending: ${error}`,
      );
      return false;
    }
  }

  private async processRollbackAckMessage(
    message: RollbackAckMessage,
  ): Promise<boolean> {
    const fnTag = `${this.className}#processRollbackAckMessage()`;
    try {
      if (message.success) {
        this.log.info(
          `${fnTag} Rollback acknowledged by the counterparty for session ID: ${message.sessionId}`,
        );
        return true;
      } else {
        this.log.warn(
          `${fnTag} Rollback failed at counterparty for session ID: ${message.sessionId}`,
        );
        return false;
      }
    } catch (error) {
      this.log.error(`${fnTag} Error processing RollbackAckMessage: ${error}`);
      return false;
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

  private loadPubKeys(gateways: Map<string, GatewayIdentity>): void {
    gateways.forEach((gateway) => {
      if (gateway.pubKey) {
        this.gatewaysPubKeys.set(gateway.id, gateway.pubKey);
      }
    });
    this.gatewaysPubKeys.set(
      this.orchestrator.getSelfId(),
      this.orchestrator.ourGateway.pubKey!,
    );
  }
}
