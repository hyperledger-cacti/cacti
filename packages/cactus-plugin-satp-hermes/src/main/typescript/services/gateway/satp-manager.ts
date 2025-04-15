import {
  Checks,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { Stage0SATPHandler } from "../../core/stage-handlers/stage0-handler";
import { Stage0ServerService } from "../../core/stage-services/server/stage0-server-service";

import { Stage1SATPHandler } from "../../core/stage-handlers/stage1-handler";
import { Stage1ServerService } from "../../core/stage-services/server/stage1-server-service";
import { Stage2ServerService } from "../../core/stage-services/server/stage2-server-service";
import { Stage3ServerService } from "../../core/stage-services/server/stage3-server-service";
import { SATPSession } from "../../core/satp-session";
import { GatewayIdentity } from "../../core/types";
import { Stage0ClientService } from "../../core/stage-services/client/stage0-client-service";
import { Stage1ClientService } from "../../core/stage-services/client/stage1-client-service";
import { Stage2ClientService } from "../../core/stage-services/client/stage2-client-service";
import { Stage3ClientService } from "../../core/stage-services/client/stage3-client-service";
import {
  SATPService,
  SATPHandler,
  SATPServiceType,
  SATPHandlerOptions,
  SATPHandlerType,
  SATPHandlerInstance,
} from "../../types/satp-protocol";
import {
  ISATPServiceOptions,
  SATPServiceInstance,
  SATPStagesV02,
} from "../../core/stage-services/satp-service";
import { Stage2SATPHandler } from "../../core/stage-handlers/stage2-handler";
import { Stage3SATPHandler } from "../../core/stage-handlers/stage3-handler";
import { SATPCrossChainManager } from "../../cross-chain-mechanisms/satp-cc-manager";
import { GatewayOrchestrator } from "./gateway-orchestrator";
import { State } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import type { SessionData } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import type { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import type { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import type { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import type { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import type { Client as ConnectClient } from "@connectrpc/connect";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { getMessageInSessionData } from "../../core/session-utils";
import {
  TransferProposalRequest,
  TransferProposalResponse,
  TransferCommenceRequest,
  TransferCommenceResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import {
  LockAssertionRequest,
  LockAssertionResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import {
  CommitPreparationRequest,
  CommitPreparationResponse,
  CommitFinalAssertionRequest,
  CommitFinalAssertionResponse,
  TransferCompleteRequest,
  TransferCompleteResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import {
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
  PreSATPTransferResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import {
  CreateSATPRequestError,
  RecoverMessageError,
  RetrieveSATPMessageError,
  TransactError,
} from "../../core/errors/satp-errors";
import { getMessageTypeName } from "../../core/satp-utils";
import { HealthCheckResponseStatusEnum } from "../../generated/gateway-client/typescript-axios";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../../database/repository/interfaces/repository";
import { ISATPLoggerConfig, SATPLogger } from "../../logging";
import { NetworkId } from "../network-identification/chainid-list";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { MonitorService } from "../monitoring/monitor";

export interface ISATPManagerOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  sessions?: Map<string, SATPSession>;
  signer: JsObjectSigner;
  pubKey: string;
  connectedDLTs: NetworkId[];
  bridgeManager: SATPCrossChainManager;
  orchestrator: GatewayOrchestrator;
  defaultRepository: boolean;
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
}
export class SATPManager {
  public static readonly CLASS_NAME = "SATPManager";
  private readonly logger: Logger;
  private readonly instanceId: string;
  private status: HealthCheckResponseStatusEnum;
  private endpoints: any[] | undefined;
  private signer: JsObjectSigner;
  public connectedDLTs: NetworkId[] = [];
  private supportedDLTs: LedgerType[] = [];
  private sessions: Map<string, SATPSession>;
  // maps stage to client/service and service class
  private readonly satpServices: Map<
    string,
    Map<SATPServiceType, SATPService>
  > = new Map();
  private readonly satpHandlers: Map<SATPHandlerType, SATPHandler> = new Map();
  private _pubKey: string;

  private readonly bridgesManager: SATPCrossChainManager;

  private readonly orchestrator: GatewayOrchestrator;

  private gatewaysPubKeys: Map<string, string> = new Map();
  private defaultRepository: boolean;
  private localRepository: ILocalLogRepository;
  private remoteRepository: IRemoteLogRepository | undefined;
  private readonly dbLogger: SATPLogger;
  private readonly monitorService: MonitorService;

  constructor(public readonly options: ISATPManagerOptions) {
    const fnTag = `${SATPManager.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "DEBUG";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
    this.status = HealthCheckResponseStatusEnum.Available;
    this.connectedDLTs = options.connectedDLTs;
    this.signer = options.signer;
    this.bridgesManager = options.bridgeManager;
    this.supportedDLTs = this.bridgesManager.getSupportedDLTs();
    this.orchestrator = options.orchestrator;
    this._pubKey = options.pubKey;
    this.loadPubKeys(this.orchestrator.getCounterPartyGateways());
    this.defaultRepository = options.defaultRepository;
    this.localRepository = options.localRepository;
    this.remoteRepository = options.remoteRepository;

    this.sessions = options.sessions || new Map<string, SATPSession>();
    const handlersClasses = [
      Stage0SATPHandler as unknown as SATPHandlerInstance,
      Stage1SATPHandler as unknown as SATPHandlerInstance,
      Stage2SATPHandler as unknown as SATPHandlerInstance,
      Stage3SATPHandler as unknown as SATPHandlerInstance,
    ];

    const satpLoggerConfig: ISATPLoggerConfig = {
      defaultRepository: this.defaultRepository,
      localRepository: this.localRepository,
      remoteRepository: this.remoteRepository,
      signer: this.signer,
      pubKey: this.pubKey,
    };

    this.dbLogger = new SATPLogger(satpLoggerConfig);
    this.logger.debug(`${fnTag} dbLogger initialized: ${!!this.dbLogger}`);
    this.monitorService = MonitorService.createOrGetMonitorService({
      logLevel: options.logLevel,
    });

    void this.initializeMonitorService();

    const serviceClasses = [
      Stage0ServerService as unknown as SATPServiceInstance,
      Stage0ClientService as unknown as SATPServiceInstance,
      Stage1ServerService as unknown as SATPServiceInstance,
      Stage1ClientService as unknown as SATPServiceInstance,
      Stage2ServerService as unknown as SATPServiceInstance,
      Stage2ClientService as unknown as SATPServiceInstance,
      Stage3ServerService as unknown as SATPServiceInstance,
      Stage3ClientService as unknown as SATPServiceInstance,
    ];

    const serviceOptions = this.initializeServiceOptions(
      serviceClasses,
      level,
      label,
    );
    this.initializeServices(serviceClasses, serviceOptions);

    if (serviceClasses.length % 2 !== 0) {
      throw new Error(
        "Invalid number of service classes. Each handler needs one server and one client service.",
      );
    }
    const handlersOptions = this.initializeHandlerOptions(
      serviceClasses,
      level,
    );

    this.initializeHandlers(handlersClasses, handlersOptions);

    this.orchestrator.addHandlers(this.satpHandlers);
  }
  private async initializeMonitorService(): Promise<void> {
    const fnTag = `${this.className}#initializeMonitorService()`;
    try {
      await this.monitorService.init();
      await this.monitorService.createMetric("satp.active_sessions");
      await this.monitorService.createMetric("satp.transfer.count");
      await this.monitorService.createMetric("satp.transfer.success");
      await this.monitorService.createMetric("satp.transfer.failure");
      this.logger.info(`${fnTag} Monitoring service initialized`);
    } catch (error) {
      // Log error but don't throw - allow service to continue without monitoring
      this.logger.warn(
        `${fnTag} Failed to initialize monitoring service: ${error}`,
      );
    }
  }
  public get pubKey(): string {
    return this._pubKey;
  }

  public getMonitorService(): MonitorService {
    return this.monitorService;
  }

  public getSupportedDLTs(): LedgerType[] {
    return this.supportedDLTs;
  }

  public getServiceByStage(
    serviceType: SATPServiceType,
    stageID: string,
  ): SATPService {
    // we assume stages are numbers
    if (isNaN(Number(stageID))) {
      throw new Error("Invalid stageId");
    }

    if (!this.satpServices) {
      throw new Error("No satp services defined");
    }

    const service = this.satpServices.get(stageID)?.get(serviceType);

    if (service == undefined) {
      throw new Error(
        `Service not found for stageId=${stageID} and serviceType=${serviceType}`,
      );
    }
    return service;
  }

  public get className(): string {
    return SATPManager.CLASS_NAME;
  }

  public healthCheck(): HealthCheckResponseStatusEnum {
    const fnTag = `${SATPManager.CLASS_NAME}#healthCheck`;
    const span = this.monitorService.startSpan(fnTag);
    try {
      return this.status;
    } finally {
      span.end();
    }
  }
  public getSessions(): Map<string, SATPSession> {
    const fnTag = `${SATPManager.CLASS_NAME}#getSessions`;
    const span = this.monitorService.startSpan(fnTag);
    try {
      const activeSessionsCount = this.sessions.size;
      void this.monitorService.incrementCounter(
        "satp.active_sessions",
        activeSessionsCount,
      );
      this.logger.debug(`${fnTag} active sessions: ${activeSessionsCount}`);
      return this.sessions;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  public getSession(sessionId: string): SATPSession | undefined {
    const fnTag = `${SATPManager.CLASS_NAME}#getSession`;
    const span = this.monitorService.startSpan(fnTag);
    span.setAttributes({ sessionId });

    try {
      this.logger.debug(`${fnTag} retrieving session: ${sessionId}`);
      if (this.sessions == undefined) {
        return undefined;
      }
      return this.sessions.get(sessionId);
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  public getConnectedDLTs(): NetworkId[] {
    return this.connectedDLTs;
  }

  public getSATPHandler(type: SATPHandlerType): SATPHandler | undefined {
    return this.satpHandlers.get(type);
  }

  /*
   * Function checks if all the sessions are in the completed state
   * @returns boolean
   */
  public getSATPSessionState(): boolean {
    const fnTag = `${SATPManager.CLASS_NAME}#getSATPSessionStatus()`;
    this.logger.info(`${fnTag}, Getting SATP Session Status...`);
    for (const value of this.sessions.values()) {
      if (value.getSessionState() !== State.COMPLETED) {
        return false;
      }
    }
    return true;
  }

  public getOrCreateSession(
    sessionId?: string,
    contextID?: string,
  ): SATPSession {
    if (!sessionId) {
      //TODO maybe compare to ""
      if (!contextID) {
        throw new Error("ContextID missing");
      }
      return this.createNewSession(contextID || "MOCK_CONTEXT_ID");
    } else {
      const existingSession = this.sessions.get(sessionId);
      return existingSession || this.createNewSession("MOCK_CONTEXT_ID");
    }
  }

  private createNewSession(contextID: string): SATPSession {
    const session = new SATPSession({
      contextID: contextID,
      server: false,
      client: true,
    });
    this.sessions?.set(session.getSessionId(), session);
    return session;
  }

  get StageHandlers() {
    throw new Error("Not implemented yet");
  }

  private initializeServiceOptions(
    serviceClasses: SATPServiceInstance[],
    logLevel: LogLevelDesc,
    label: string,
  ): ISATPServiceOptions[] {
    const fnTag = `${SATPManager.CLASS_NAME}#initializeServiceOptions()`;
    this.logger.info(`${fnTag}, Initializing services options...`);
    this.logger.info(
      `Initializing ${serviceClasses.length} services options...`,
    );
    return serviceClasses.map((serviceClass) => ({
      signer: this.signer,
      stage: serviceClass.SATP_STAGE as SATPStagesV02,
      loggerOptions: { level: logLevel, label },
      // we can pass whatever name we wish; in this case we are using the internal service name
      serviceType: serviceClass.SERVICE_TYPE,
      serviceName: serviceClass.SATP_SERVICE_INTERNAL_NAME,
      bridgeManager: this.bridgesManager,
      dbLogger: this.dbLogger,
    }));
  }

  private initializeServices(
    serviceClasses: SATPServiceInstance[],
    serviceOptions: ISATPServiceOptions[],
  ): void {
    const fnTag = `${SATPManager.CLASS_NAME}#initializeServices()`;
    this.logger.info(`${fnTag}, Initializing services...`);

    if (serviceClasses.length === 0) {
      throw new Error("No services provided");
    }

    if (serviceOptions.length === 0) {
      throw new Error("No services options provided");
    }

    if (serviceClasses.length !== serviceOptions.length) {
      throw new Error(
        `Number of services classes and options do not match. Each service class needs an options object.\n \
          Classes: ${serviceClasses.length}, Options: ${serviceOptions.length}`,
      );
    }

    serviceClasses.forEach((ServiceClass, index) => {
      const service = new ServiceClass(serviceOptions[index]);
      if (!this.satpServices.has(service.stage)) {
        // initialize map
        this.satpServices.set(service.stage, new Map());
      }
      this.satpServices.get(service.stage)?.set(service.serviceType, service);
    });
  }

  private initializeHandlerOptions(
    serviceClasses: SATPServiceInstance[],
    level: LogLevelDesc = "DEBUG",
  ): SATPHandlerOptions[] {
    const fnTag = `${SATPManager.CLASS_NAME}#initializeHandlerOptions()`;
    this.logger.info(`${fnTag}, Initializing handlers options...`);

    const handlersOptions: SATPHandlerOptions[] = [];
    if (serviceClasses.length % 2 != 0) {
      throw new Error(
        "Error intializing handler options - a pair number of services are expected",
      );
    }
    try {
      for (let i = 0; i <= serviceClasses.length / 2 - 1; i++) {
        const serviceIndex = i.toString() as SATPStagesV02;
        const serverService = this.getServiceByStage(
          SATPServiceType.Server,
          serviceIndex,
        );

        const clientService = this.getServiceByStage(
          SATPServiceType.Client,
          serviceIndex,
        );

        const handlerOptions: SATPHandlerOptions = {
          sessions: this.sessions,
          serverService: serverService,
          clientService: clientService,
          connectedDLTs: this.connectedDLTs,
          pubkeys: this.gatewaysPubKeys,
          gatewayId: this.orchestrator.ourGateway.id,
          stage: serviceIndex,
          loggerOptions: {
            level: level,
            label: `SATPHandler-Stage${serviceIndex}`,
          },
        };
        handlersOptions.push(handlerOptions);
      }
    } catch (error) {
      this.logger.error(`Error creating handler options: ${error}`);
    }

    return handlersOptions;
  }

  private initializeHandlers(
    handlersClasses: SATPHandlerInstance[],
    handlersOptions: SATPHandlerOptions[],
  ): void {
    const fnTag = `${SATPManager.CLASS_NAME}#initializeHandlers()`;
    this.logger.info(`${fnTag}, Initializing handlers...`);

    if (handlersClasses.length === 0) {
      throw new Error("No handlers provided");
    }

    if (handlersOptions.length === 0) {
      throw new Error("No handler options provided");
    }

    if (handlersClasses.length !== handlersOptions.length) {
      throw new Error(
        `Number of handler classes and options do not match. Each handler class needs an options object.\n \
          Classes: ${handlersClasses.length}, Options: ${handlersOptions.length}`,
      );
    }

    handlersOptions.forEach((options, index) => {
      if (index < handlersClasses.length) {
        const HandlerClass = handlersClasses[index];
        const handler = new HandlerClass(options);
        this.satpHandlers.set(handler.getHandlerIdentifier(), handler);
      }
    });
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

  public async transfer(
    session: SATPSession,
    stage?: MessageType,
  ): Promise<void> {
    const fnTag = `${SATPManager.CLASS_NAME}#transfer()`;
    try {
      if (!stage) {
        this.logger.debug(
          `${fnTag}, Initiating Transfer ${session.getSessionId()}`,
        );
      } else {
        this.logger.debug(`${fnTag}, Recovering Transfer at stage ${stage}`);
      }

      const clientSessionData = session.getClientSessionData();
      const bridge = this.bridgesManager.getBridge(
        clientSessionData.senderGatewayNetworkId,
      );
      clientSessionData.senderGatewayNetworkType =
        bridge.getNetworkType() as string;
      const clientSessionDataJson = safeStableStringify(clientSessionData);
      this.logger.debug(`clientSessionDataJson=%s`, clientSessionDataJson);

      if (!clientSessionData) {
        throw new Error(`${fnTag}, Session not found`);
      }

      //maybe get a suitable gateway first.
      const channel = this.orchestrator.getChannel(
        clientSessionData.recipientGatewayNetworkId,
      );

      if (!channel) {
        throw new Error(`${fnTag}, Channel not found`);
      }
      const counterGatewayID = this.orchestrator.getGatewayIdentity(
        channel.toGatewayID,
      );
      if (!counterGatewayID) {
        throw new Error(`${fnTag}, counterparty gateway ID not found`);
      }

      const sessionData: SessionData = clientSessionData;

      sessionData.receiverGatewayOwnerId = channel.toGatewayID;

      const clientSatpStage0: ConnectClient<typeof SatpStage0Service> =
        channel.clients.get("0") as ConnectClient<typeof SatpStage0Service>;

      if (!clientSatpStage0) {
        throw new Error(`${fnTag}, Failed to get clientSatpStage0`);
      }

      const clientSatpStage1: ConnectClient<typeof SatpStage1Service> =
        channel.clients.get("1") as ConnectClient<typeof SatpStage1Service>;

      if (!clientSatpStage1) {
        throw new Error(`${fnTag}, Failed to get clientSatpStage1`);
      }

      const clientSatpStage2: ConnectClient<typeof SatpStage2Service> =
        channel.clients.get("2") as ConnectClient<typeof SatpStage2Service>;

      if (!clientSatpStage2) {
        throw new Error(`${fnTag}, Failed to get clientSatpStage2`);
      }
      const clientSatpStage3: ConnectClient<typeof SatpStage3Service> =
        channel.clients.get("3") as ConnectClient<typeof SatpStage3Service>;

      if (!clientSatpStage3) {
        throw new Error(`${fnTag}, Failed to get clientSatpStage3`);
      }

      if (!counterGatewayID.pubKey) {
        throw new Error(`${fnTag}, Failed to retrieve serverGatewayPubkey`);
      }

      sessionData.serverGatewayPubkey = counterGatewayID.pubKey;

      let newSessionRequest: NewSessionRequest | undefined;
      let newSessionResponse: NewSessionResponse | undefined;
      let preSATPTransferRequest: PreSATPTransferRequest | undefined;
      let preSATPTransferResponse: PreSATPTransferResponse | undefined;
      let transferProposalRequest: TransferProposalRequest | undefined;
      let transferProposalResponse: TransferProposalResponse | undefined;
      let transferCommenceRequest: TransferCommenceRequest | undefined;
      let transferCommenceResponse: TransferCommenceResponse | undefined;
      let lockAssertionRequest: LockAssertionRequest | undefined;
      let lockAssertionResponse: LockAssertionResponse | undefined;
      let commitPreparationRequest: CommitPreparationRequest | undefined;
      let commitReadyResponse: CommitPreparationResponse | undefined;
      let commitFinalAssertionRequest: CommitFinalAssertionRequest | undefined;
      let commitFinalAcknowledgementReceiptResponse:
        | CommitFinalAssertionResponse
        | undefined;
      let transferCompleteRequest: TransferCompleteRequest | undefined;
      let transferCompleteResponse: TransferCompleteResponse | undefined;

      switch (stage) {
        case undefined:
        case MessageType.NEW_SESSION_REQUEST:
          this.logger.debug(`${fnTag}, Initiating Stage 0`);
          newSessionRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE0) as Stage0SATPHandler
          ).NewSessionRequest(session.getSessionId());

          if (!newSessionRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
            );
          }

        case MessageType.NEW_SESSION_RESPONSE:
          if (!newSessionRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 0, NewSessionRequest`,
            );
            newSessionRequest = getMessageInSessionData(
              sessionData,
              MessageType.NEW_SESSION_REQUEST,
            ) as NewSessionRequest;

            if (!newSessionRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
              );
            }
          }

          newSessionResponse =
            await clientSatpStage0.newSession(newSessionRequest);

          this.logger.debug(
            `${fnTag}, newSessionResponse: ${safeStableStringify(newSessionResponse)}`,
          );

          if (!newSessionResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
            );
          }

        case MessageType.PRE_SATP_TRANSFER_REQUEST:
          if (!newSessionResponse) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 0, NewSessionResponse`,
            );
            newSessionResponse = getMessageInSessionData(
              sessionData,
              MessageType.NEW_SESSION_RESPONSE,
            ) as NewSessionResponse;

            if (!newSessionResponse) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
              );
            }
          }

          preSATPTransferRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE0) as Stage0SATPHandler
          ).PreSATPTransferRequest(newSessionResponse, session.getSessionId());

          if (!preSATPTransferRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
            );
          }

        case MessageType.PRE_SATP_TRANSFER_RESPONSE:
          if (!preSATPTransferRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 0, PreSATPTransferRequest`,
            );
            preSATPTransferRequest = getMessageInSessionData(
              sessionData,
              MessageType.PRE_SATP_TRANSFER_REQUEST,
            ) as PreSATPTransferRequest;

            if (!preSATPTransferRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
              );
            }
          }

          preSATPTransferResponse = await clientSatpStage0.preSATPTransfer(
            preSATPTransferRequest,
          );

          this.logger.debug(
            `${fnTag}, preSATPTransferResponse: ${safeStableStringify(preSATPTransferResponse)}`,
          );

          if (!preSATPTransferResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
            );
          }

        case MessageType.INIT_PROPOSAL:
          if (!preSATPTransferResponse) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 0, PreSATPTransferResponse`,
            );
            preSATPTransferResponse = getMessageInSessionData(
              sessionData,
              MessageType.PRE_SATP_TRANSFER_RESPONSE,
            ) as PreSATPTransferResponse;

            if (!preSATPTransferResponse) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
              );
            }
          }

          this.logger.debug(`${fnTag}, Initiating Stage 1`);

          transferProposalRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE1) as Stage1SATPHandler
          ).TransferProposalRequest(
            session.getSessionId(),
            preSATPTransferResponse,
          );

          if (!transferProposalRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.INIT_PROPOSAL),
            );
          }
        case MessageType.INIT_RECEIPT:
        case MessageType.INIT_REJECT:
          if (!transferProposalRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 1, TransferProposalRequest`,
            );
            transferProposalRequest = getMessageInSessionData(
              sessionData,
              MessageType.INIT_PROPOSAL,
            ) as TransferProposalRequest;

            if (!transferProposalRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.INIT_PROPOSAL),
              );
            }
          }

          transferProposalResponse = await clientSatpStage1.transferProposal(
            transferProposalRequest,
          );

          this.logger.debug(
            `${fnTag}, transferProposalResponse: ${safeStableStringify(transferProposalResponse)}`,
          );

          if (!transferProposalResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.INIT_RECEIPT),
            );
          }
        case MessageType.TRANSFER_COMMENCE_REQUEST:
          if (!transferProposalResponse) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 1, TransferProposalResponse`,
            );
            transferProposalResponse = getMessageInSessionData(
              sessionData,
              MessageType.INIT_RECEIPT,
            ) as TransferProposalResponse;

            if (!transferProposalResponse) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.INIT_RECEIPT),
              );
            }
          }

          transferCommenceRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE1) as Stage1SATPHandler
          ).TransferCommenceRequest(transferProposalResponse);

          if (!transferCommenceRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
            );
          }
        case MessageType.TRANSFER_COMMENCE_RESPONSE:
          if (!transferCommenceRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 1, TransferCommenceRequest`,
            );
            transferCommenceRequest = getMessageInSessionData(
              sessionData,
              MessageType.TRANSFER_COMMENCE_REQUEST,
            ) as TransferCommenceRequest;

            if (!transferCommenceRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
              );
            }
          }

          transferCommenceResponse = await clientSatpStage1.transferCommence(
            transferCommenceRequest,
          );

          this.logger.debug(
            `${fnTag}, transferCommenceResponse: ${safeStableStringify(transferCommenceResponse)}`,
          );

          if (!transferCommenceResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_RESPONSE),
            );
          }
        case MessageType.LOCK_ASSERT:
          if (!transferCommenceResponse) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 1, TransferCommenceResponse`,
            );
            transferCommenceResponse = getMessageInSessionData(
              sessionData,
              MessageType.TRANSFER_COMMENCE_RESPONSE,
            ) as TransferCommenceResponse;

            if (!transferCommenceResponse) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.TRANSFER_COMMENCE_RESPONSE),
              );
            }
          }

          this.logger.debug(`${fnTag}, Initiating Stage 2`);

          lockAssertionRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE2) as Stage2SATPHandler
          ).LockAssertionRequest(transferCommenceResponse);

          if (!lockAssertionRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.LOCK_ASSERT),
            );
          }
        case MessageType.ASSERTION_RECEIPT:
          if (!lockAssertionRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 2, LockAssertionRequest`,
            );
            lockAssertionRequest = getMessageInSessionData(
              sessionData,
              MessageType.LOCK_ASSERT,
            ) as LockAssertionRequest;

            if (!lockAssertionRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.LOCK_ASSERT),
              );
            }
          }

          lockAssertionResponse =
            await clientSatpStage2.lockAssertion(lockAssertionRequest);

          this.logger.debug(
            `${fnTag}, lockAssertionResponse: ${safeStableStringify(lockAssertionResponse)}`,
          );

          if (!lockAssertionResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.ASSERTION_RECEIPT),
            );
          }
        case MessageType.COMMIT_PREPARE:
          if (!lockAssertionResponse) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 2, LockAssertionResponse`,
            );
            lockAssertionResponse = getMessageInSessionData(
              sessionData,
              MessageType.ASSERTION_RECEIPT,
            ) as LockAssertionResponse;

            if (!lockAssertionResponse) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.ASSERTION_RECEIPT),
              );
            }
          }

          this.logger.debug(`${fnTag}, Initiating Stage 3`);

          commitPreparationRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE3) as Stage3SATPHandler
          ).CommitPreparationRequest(lockAssertionResponse);

          if (!commitPreparationRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_PREPARE),
            );
          }
        case MessageType.COMMIT_READY:
          if (!commitPreparationRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 3, CommitPreparationRequest`,
            );
            commitPreparationRequest = getMessageInSessionData(
              sessionData,
              MessageType.COMMIT_PREPARE,
            ) as CommitPreparationRequest;

            if (!commitPreparationRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.COMMIT_PREPARE),
              );
            }
          }

          commitReadyResponse = await clientSatpStage3.commitPreparation(
            commitPreparationRequest,
          );

          this.logger.debug(
            `${fnTag}, commitReadyResponse: ${safeStableStringify(commitReadyResponse)}`,
          );

          if (!commitReadyResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_READY),
            );
          }
        case MessageType.COMMIT_FINAL:
          if (!commitReadyResponse) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 3, CommitReadyResponse`,
            );
            commitReadyResponse = getMessageInSessionData(
              sessionData,
              MessageType.COMMIT_READY,
            ) as CommitPreparationResponse;

            if (!commitReadyResponse) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.COMMIT_READY),
              );
            }
          }

          commitFinalAssertionRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE3) as Stage3SATPHandler
          ).CommitFinalAssertionRequest(commitReadyResponse);

          if (!commitFinalAssertionRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_FINAL),
            );
          }

        case MessageType.ACK_COMMIT_FINAL:
          if (!commitFinalAssertionRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 3, CommitFinalAssertionRequest`,
            );
            commitFinalAssertionRequest = getMessageInSessionData(
              sessionData,
              MessageType.COMMIT_FINAL,
            ) as CommitFinalAssertionRequest;

            if (!commitFinalAssertionRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.COMMIT_FINAL),
              );
            }
          }

          commitFinalAcknowledgementReceiptResponse =
            await clientSatpStage3.commitFinalAssertion(
              commitFinalAssertionRequest,
            );

          this.logger.debug(
            `${fnTag}, commitFinalAcknowledgementReceiptResponse: ${safeStableStringify(commitFinalAcknowledgementReceiptResponse)}`,
          );

          if (!commitFinalAcknowledgementReceiptResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
            );
          }
        case MessageType.COMMIT_TRANSFER_COMPLETE:
          if (!commitFinalAcknowledgementReceiptResponse) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 3, CommitFinalAcknowledgementReceiptResponse`,
            );
            commitFinalAcknowledgementReceiptResponse = getMessageInSessionData(
              sessionData,
              MessageType.ACK_COMMIT_FINAL,
            ) as CommitFinalAssertionResponse;

            if (!commitFinalAcknowledgementReceiptResponse) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
              );
            }
          }

          transferCompleteRequest = await (
            this.getSATPHandler(SATPHandlerType.STAGE3) as Stage3SATPHandler
          ).TransferCompleteRequest(commitFinalAcknowledgementReceiptResponse);

          if (!transferCompleteRequest) {
            throw new CreateSATPRequestError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE),
            );
          }
        case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
          if (!transferCompleteRequest) {
            this.logger.debug(
              `${fnTag}, Recovering from Stage 3, TransferCompleteRequest`,
            );
            transferCompleteRequest = getMessageInSessionData(
              sessionData,
              MessageType.COMMIT_TRANSFER_COMPLETE,
            ) as TransferCompleteRequest;

            if (!transferCompleteRequest) {
              throw new RecoverMessageError(
                fnTag,
                getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE),
              );
            }
          }

          transferCompleteResponse = await clientSatpStage3.transferComplete(
            transferCompleteRequest,
          );

          this.logger.debug(
            `${fnTag}, transferCompleteResponse: ${safeStableStringify(transferCompleteResponse)}`,
          );

          if (!transferCompleteResponse) {
            throw new RetrieveSATPMessageError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
            );
          }

          (
            this.getSATPHandler(SATPHandlerType.STAGE3) as Stage3SATPHandler
          ).CheckTransferCompleteResponse(transferCompleteResponse);
          break;
        default:
          throw new Error("Invalid stage");
      }
      this.logger.debug(
        `${fnTag}, Transfer Completed for session: ${session.getSessionId()}`,
      );
    } catch (error) {
      this.logger.error(`${fnTag}, Failed to transact\nError: ${error}`);
      throw new TransactError(fnTag, error);
    }
  }
}
