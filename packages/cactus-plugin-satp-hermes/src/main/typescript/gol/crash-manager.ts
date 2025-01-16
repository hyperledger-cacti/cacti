import {
  Logger,
  LoggerProvider,
  Checks,
  LogLevelDesc,
  JsObjectSigner,
} from "@hyperledger/cactus-common";
import {
  Type,
  SessionData,
  State,
} from "../generated/proto/cacti/satp/v02/common/session_pb";
import { CrashRecoveryHandler } from "../core/crash-management/crash-handler";
import { SATPSession } from "../core/satp-session";
import {
  RollbackStrategy,
  RollbackStrategyFactory,
} from "../core/crash-management/rollback/rollback-strategy-factory";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../repository/interfaces/repository";
import {
  RecoverUpdateMessage,
  RollbackState,
  RollbackAckMessage,
} from "../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgesManager } from "./satp-bridges-manager";
import schedule, { Job } from "node-schedule";
import { CrashRecoveryServerService } from "../core/crash-management/server-service";
import { CrashRecoveryClientService } from "../core/crash-management/client-service";
import { GatewayOrchestrator } from "./gateway-orchestrator";
import { Client as PromiseConnectClient } from "@connectrpc/connect";
import { GatewayIdentity, SupportedChain } from "../core/types";
import { CrashRecovery } from "../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPHandler } from "../types/satp-protocol";
import { CrashStatus } from "../core/types";
import { verifySignature } from "../gateway-utils";

export interface ICrashRecoveryManagerOptions {
  logLevel?: LogLevelDesc;
  defaultRepository: boolean;
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  instanceId: string;
  bridgeConfig: SATPBridgesManager;
  orchestrator: GatewayOrchestrator;
  signer: JsObjectSigner;
  healthCheckInterval?: string | schedule.RecurrenceRule;
}

export class CrashManager {
  public static readonly CLASS_NAME = "CrashManager";
  private readonly log: Logger;
  private readonly instanceId: string;
  public sessions: Map<string, SATPSession>;
  private crashRecoveryHandler: CrashRecoveryHandler;
  private factory: RollbackStrategyFactory;
  private defaultRepository: boolean;
  public localRepository: ILocalLogRepository;
  public remoteRepository: IRemoteLogRepository | undefined;
  private crashScheduler?: Job;
  private isSchedulerPaused = false;
  private crashRecoveryServerService: CrashRecoveryServerService;
  private crashRecoveryClientService: CrashRecoveryClientService;
  private orchestrator: GatewayOrchestrator;
  private gatewaysPubKeys: Map<string, string> = new Map();
  private readonly bridgesManager: SATPBridgesManager;
  private signer: JsObjectSigner;

  constructor(public readonly options: ICrashRecoveryManagerOptions) {
    const fnTag = `${CrashManager.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel;
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.info(`Instantiated ${this.className} OK`);
    this.instanceId = options.instanceId;
    this.sessions = new Map<string, SATPSession>();
    this.defaultRepository = options.defaultRepository;
    this.localRepository = options.localRepository;
    this.remoteRepository = options.remoteRepository;
    this.signer = options.signer;
    this.orchestrator = options.orchestrator;
    this.bridgesManager = options.bridgeConfig;
    this.loadPubKeys(this.orchestrator.getCounterPartyGateways());

    this.factory = new RollbackStrategyFactory(this.bridgesManager, this.log);

    this.crashRecoveryServerService = new CrashRecoveryServerService(
      this.bridgesManager,
      this.defaultRepository,
      this.localRepository,
      this.sessions,
      this.signer,
      this.log,
    );

    this.crashRecoveryClientService = new CrashRecoveryClientService(
      this.log,
      this.signer,
    );

    this.crashRecoveryHandler = new CrashRecoveryHandler(
      this.crashRecoveryServerService,
      this.crashRecoveryClientService,
      this.log,
    );

    const crashRecoveryHandlers = new Map<string, SATPHandler>();
    crashRecoveryHandlers.set("crash-handler", this.crashRecoveryHandler);
    this.orchestrator.addHandlers(crashRecoveryHandlers);
  }

  get className(): string {
    return CrashManager.CLASS_NAME;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public pauseScheduler(): void {
    if (!this.isSchedulerPaused) {
      this.isSchedulerPaused = true;
      this.log.info(`${this.className}#pauseScheduler() Scheduler paused!`);
    }
  }

  public resumeScheduler(): void {
    if (this.isSchedulerPaused) {
      this.isSchedulerPaused = false;
      this.log.info(`${this.className}#resumeScheduler() Scheduler resumed!`);
    }
  }

  public stopScheduler(): void {
    const fnTag = `${this.className}#stopScheduler()`;

    if (this.crashScheduler) {
      this.crashScheduler.cancel();
      this.crashScheduler = undefined;
      this.log.info(`${fnTag} crash detection job stopped successfully`);
    } else {
      this.log.warn(`${fnTag} No active crash detection job to stop`);
    }
  }

  // TODO: fetch (x) logs to recreate session (for single gateway topology)
  public async recoverSessions(): Promise<void> {
    const fnTag = `${this.className}#recoverSessions()`;

    try {
      const allLogs = await this.localRepository.readLogsNotProofs();

      if (allLogs.length === 0) {
        this.log.info(`${fnTag} No logs available for recovery.`);
        return;
      }

      const log = allLogs[0];
      const sessionId = log.sessionId;
      this.log.info(`${fnTag} Recovering session from database: ${sessionId}`);

      if (!log || !log.data) {
        throw new Error(`${fnTag} Invalid log for session ID: ${sessionId}`);
      }

      const sessionData: SessionData = JSON.parse(log.data);

      const satpSession = SATPSession.recreateSession(sessionData);
      this.sessions.set(sessionId, satpSession);
      this.log.info(
        `${fnTag} Successfully reconstructed session: ${sessionId}`,
      );

      if (this.sessions.size === 0) {
        this.log.info(`${fnTag} No active sessions!`);
        return;
      }

      this.initializeCrashDetection(sessionId);
    } catch (error) {
      this.log.error(`${fnTag} Error during session recovery: ${error}`);
    }
  }

  private initializeCrashDetection(sessionId: string): void {
    const fnTag = `${this.className}#initializeCrashDetection()`;

    try {
      // Timeout checker for crash detection of counterparty
      this.crashScheduler = schedule.scheduleJob(
        this.options.healthCheckInterval || "*/2 * * * * *", // default 2000 ms
        async () => {
          if (this.isSchedulerPaused) {
            this.log.debug(`${fnTag} Scheduler paused! Skipping check.`);
            return;
          }

          const session = this.sessions.get(sessionId);
          if (session) {
            await this.checkAndResolveCrashes(session);
          } else {
            this.log.warn(
              `${fnTag} No session found for session ID: ${sessionId}`,
            );
          }
        },
      );
      this.log.info(
        `${fnTag} Crash detection job running for session ID: ${sessionId}`,
      );
    } catch (error) {
      this.log.error(
        `${fnTag} Error initializing crash detection job: ${error}`,
      );
    }
  }

  private updateSessionState(sessionId: string, newState: State): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found.`);
    }

    const updatedState: string[] = [];
    if (session.hasClientSessionData()) {
      const clientSessionData = session.getClientSessionData();
      clientSessionData.state = newState;
      this.log.debug(
        `Updated client session state to ${State[newState]} for session ${sessionId}`,
      );
      updatedState.push(State[clientSessionData.state]);
    }

    if (session.hasServerSessionData()) {
      const serverSessionData = session.getServerSessionData();
      serverSessionData.state = newState;
      this.log.debug(
        `Updated server session state to ${State[newState]} for session ${sessionId}`,
      );
      updatedState.push(State[serverSessionData.state]);
    }
    this.sessions.set(sessionId, session);
    return updatedState.join(", ");
  }

  public async checkAndResolveCrashes(session: SATPSession): Promise<void> {
    const fnTag = `${this.className}#checkAndResolveCrashes()`;
    if (this.sessions.size === 0) {
      this.log.info(
        `${fnTag} No sessions to check. Waiting for new sessions...`,
      );
      return;
    }

    const sessionId = session.getSessionId();

    await this.checkAndResolveCrash(session);

    const currentSession = this.sessions.get(sessionId);

    if (!currentSession) {
      this.log.warn(
        `${fnTag} Updated session with ID ${sessionId} not found after resolution!`,
      );
      return;
    }

    if (currentSession.hasClientSessionData()) {
      const clientSessionData = currentSession.getClientSessionData();
      this.log.debug(
        `${fnTag} Client Session ${sessionId} state: ${State[clientSessionData.state]}`,
      );
    }

    if (currentSession.hasServerSessionData()) {
      const serverSessionData = currentSession.getServerSessionData();
      this.log.debug(
        `${fnTag} Server Session ${sessionId} state: ${State[serverSessionData.state]}`,
      );
    }
  }

  public async checkAndResolveCrash(session: SATPSession): Promise<void> {
    const fnTag = `${this.className}#checkAndResolveCrash()`;

    const sessionDataList: SessionData[] = [];
    if (session.hasClientSessionData()) {
      sessionDataList.push(session.getClientSessionData());
    }
    if (session.hasServerSessionData()) {
      sessionDataList.push(session.getServerSessionData());
    }
    if (sessionDataList.length === 0) {
      throw new Error(
        `${fnTag}, no session data available for session : ${session.getSessionId()}`,
      );
    }

    for (const sessionData of sessionDataList) {
      let attempts = 0;
      const maxRetries = Number(sessionData.maxRetries);

      while (attempts < maxRetries) {
        const crashStatus = await this.checkCrash(sessionData);

        if (crashStatus === CrashStatus.IN_RECOVERY) {
          this.log.info(
            `${fnTag} Crash detected! Attempting recovery for session ${sessionData.id}`,
          );

          this.pauseScheduler();

          const recoverySuccess = await this.handleRecovery(sessionData);
          if (recoverySuccess) {
            this.updateSessionState(sessionData.id, State.RECOVERED);
            this.resumeScheduler();
            this.log.info(
              `${fnTag} Recovery successful for sessionID: ${sessionData.id}`,
            );
            break;
          } else {
            attempts++;
            this.log.info(
              `${fnTag} Recovery attempt ${attempts} failed for sessionID: ${sessionData.id}`,
            );
          }
        } else if (crashStatus === CrashStatus.IN_ROLLBACK) {
          this.log.warn(
            `${fnTag} Initiating rollback for session ${sessionData.id}!`,
          );

          this.pauseScheduler();

          try {
            const rollbackSuccess = await this.initiateRollback(
              session,
              sessionData,
              true,
            );
            if (rollbackSuccess) {
              this.log.info(
                `${fnTag} Rollback completed for session ${sessionData.id}`,
              );
            } else {
              this.log.error(
                `${fnTag} Rollback failed for session ${sessionData.id}.`,
              );
            }
          } finally {
            this.resumeScheduler();
          }
          break;
        } else if (crashStatus === CrashStatus.IDLE) {
          this.log.info(
            `${fnTag} No crash detected for session ID: ${sessionData.id}`,
          );
          break;
        } else {
          this.log.warn(`${fnTag} Unhandled crash status: ${crashStatus}`);
          break;
        }
      }

      if (attempts >= maxRetries) {
        this.log.warn(
          `${fnTag} All recovery attempts exhausted! Initiating rollback for session ${sessionData.id}`,
        );

        this.pauseScheduler();
        try {
          await this.initiateRollback(session, sessionData, true);
        } finally {
          this.resumeScheduler();
        }
        break; // exit after rollback
      }
    }
  }

  private async checkCrash(sessionData: SessionData): Promise<CrashStatus> {
    const fnTag = `${this.className}#checkCrash()`;

    try {
      if (!this.localRepository) {
        this.log.error(
          `${fnTag} Local repository is not available. Unable to proceed!`,
        );
        return CrashStatus.ERROR;
      }

      let lastLog = null;
      try {
        lastLog = await this.localRepository.readLastestLog(sessionData.id);
      } catch (error) {
        this.log.error(`${fnTag} : ${error.message}`);
        return CrashStatus.ERROR;
      }

      if (!lastLog) {
        this.log.warn(
          `${fnTag} No logs found for session ID: ${sessionData.id}`,
        );
        return CrashStatus.ERROR;
      }

      const logTimestamp = new Date(lastLog?.timestamp ?? 0).getTime();
      const currentTime = Date.now();
      const timeDifference = currentTime - logTimestamp;

      switch (true) {
        case lastLog.operation !== "done":
          this.log.info(
            `${fnTag} Crash detected for session ID: ${sessionData.id}, last log operation: ${lastLog.operation}`,
          );
          return CrashStatus.IN_RECOVERY;

        case timeDifference > Number(sessionData.maxTimeout):
          this.log.warn(
            `${fnTag} Timeout exceeded by ${timeDifference} ms for session ID: ${sessionData.id}`,
          );
          return CrashStatus.IN_ROLLBACK;

        default:
          this.log.info(
            `${fnTag} No crash detected for session ID: ${sessionData.id}`,
          );
          return CrashStatus.IDLE;
      }
    } catch (error) {
      this.log.error(`${fnTag} Error occurred during crash check: ${error}`);
      return CrashStatus.ERROR;
    }
  }

  public async handleRecovery(sessionData: SessionData): Promise<boolean> {
    const fnTag = `${this.className}#handleRecovery()`;
    this.log.debug(
      `${fnTag} - Starting crash recovery for sessionId: ${sessionData.id}`,
    );

    try {
      const channel = this.orchestrator.getChannel(
        sessionData.recipientGatewayNetworkId as SupportedChain,
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
        channel.clients.get("crash") as PromiseConnectClient<
          typeof CrashRecovery
        >;

      if (!clientCrashRecovery) {
        throw new Error(`${fnTag} - Failed to get clientCrashRecovery.`);
      }

      const recoverMessage =
        await this.crashRecoveryHandler.sendRecoverMessage(sessionData);

      const recoverUpdateMessage =
        await clientCrashRecovery.recoverV2Message(recoverMessage);

      const sequenceNumbers = recoverUpdateMessage.recoveredLogs.map(
        (log) => log.sequenceNumber,
      );
      this.log.info(
        `${fnTag} - Received logs sequence numbers: ${sequenceNumbers}`,
      );

      const status = await this.processRecoverUpdateMessage(
        recoverUpdateMessage,
        sessionData,
      );
      if (status) {
        const recoverSuccessMessage =
          await this.crashRecoveryHandler.sendRecoverSuccessMessage(
            sessionData,
          );

        await clientCrashRecovery.recoverV2SuccessMessage(
          recoverSuccessMessage,
        );

        this.log.info(
          `${fnTag} - Crash recovery completed for sessionId: ${sessionData.id}`,
        );

        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.log.error(
        `${fnTag} Error during recovery process for session ID: ${sessionData.id} - ${error}`,
      );
      throw new Error(`Recovery failed for session ID: ${sessionData.id}`);
    }
  }

  private async processRecoverUpdateMessage(
    message: RecoverUpdateMessage,
    sessionData: SessionData,
  ): Promise<boolean> {
    const fnTag = `${this.className}#processRecoverUpdate()`;
    try {
      verifySignature(this.signer, message, sessionData.clientGatewayPubkey);

      const recoveredLogs = message.recoveredLogs;

      for (const logEntry of recoveredLogs) {
        await this.localRepository.create({
          sessionId: logEntry.sessionId,
          operation: logEntry.operation,
          data: logEntry.data,
          timestamp: logEntry.timestamp,
          type: logEntry.type,
          key: logEntry.key,
          sequenceNumber: logEntry.sequenceNumber,
        });
      }

      for (const log of recoveredLogs) {
        const sessionId = log.sessionId;
        this.log.info(`${fnTag}, recovering session: ${sessionId}`);

        if (!log || !log.data) {
          throw new Error(`${fnTag}, invalid log`);
        }

        try {
          const updatedSessionData: SessionData = JSON.parse(log.data);

          const { hashes, processedTimestamps, signatures } =
            updatedSessionData;

          sessionData.hashes = hashes;
          sessionData.processedTimestamps = processedTimestamps;
          sessionData.signatures = signatures;
          const updatedSession = SATPSession.recreateSession(sessionData);
          this.sessions.set(sessionId, updatedSession);
          this.log.info(
            `${fnTag} Session data successfully reconstructed for session ID: ${sessionId}`,
          );
        } catch (error) {
          this.log.error(
            `Error parsing log data for session Id: ${sessionId}: ${error}`,
          );
        }
      }
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
    sessionData: SessionData,
    forceRollback?: boolean,
  ): Promise<boolean> {
    const fnTag = `CrashManager#initiateRollback()`;
    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }
    this.log.info(
      `${fnTag} Initiating rollback for session ${session.getSessionId()}`,
    );

    try {
      if (forceRollback) {
        const strategy = this.factory.createStrategy(sessionData);
        const rollbackState = await this.executeRollback(strategy, session);

        if (rollbackState?.status === "COMPLETED") {
          const cleanupSuccess = await this.performCleanup(
            strategy,
            session,
            rollbackState,
          );

          const rollbackSuccess = await this.sendRollbackMessage(
            sessionData,
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
    const fnTag = `CrashManager#executeRollback`;
    this.log.debug(
      `${fnTag} Executing rollback strategy for sessionId: ${session.getSessionId()}`,
    );

    try {
      return await strategy.execute(session, Type.CLIENT);
    } catch (error) {
      this.log.error(`${fnTag} Error executing rollback strategy: ${error}`);
      return undefined;
    }
  }

  private async sendRollbackMessage(
    sessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<boolean> {
    const fnTag = `${this.className}#sendRollbackMessage()`;
    this.log.debug(
      `${fnTag} - Starting to send RollbackMessage for sessionId: ${sessionData.id}`,
    );

    try {
      const channel = this.orchestrator.getChannel(
        sessionData.recipientGatewayNetworkId as SupportedChain,
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
        channel.clients.get("crash") as PromiseConnectClient<
          typeof CrashRecovery
        >;

      if (!clientCrashRecovery) {
        throw new Error(`${fnTag} - Failed to get clientCrashRecovery.`);
      }

      const rollbackMessage =
        await this.crashRecoveryHandler.sendRollbackMessage(
          sessionData,
          rollbackState,
        );

      const rollbackAckMessage =
        await clientCrashRecovery.rollbackV2Message(rollbackMessage);

      this.log.info(
        `${fnTag} - Received RollbackAckMessage: ${rollbackAckMessage}`,
      );

      const rollbackStatus =
        await this.processRollbackAckMessage(rollbackAckMessage);

      return rollbackStatus;
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
    const fnTag = `CrashManager#performCleanup`;
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
