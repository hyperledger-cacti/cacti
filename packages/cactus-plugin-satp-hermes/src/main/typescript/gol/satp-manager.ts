import {
  Checks,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { Stage0SATPHandler } from "../core/stage-handlers/stage0-handler";
import { Stage0ServerService } from "../core/stage-services/server/stage0-server-service";

import { Stage1SATPHandler } from "../core/stage-handlers/stage1-handler";
import { Stage1ServerService } from "../core/stage-services/server/stage1-server-service";
import { Stage2ServerService } from "../core/stage-services/server/stage2-server-service";
import { Stage3ServerService } from "../core/stage-services/server/stage3-server-service";
import { SATPSession } from "../core/satp-session";
import { SupportedChain } from "../core/types";
import { Stage0ClientService } from "../core/stage-services/client/stage0-client-service";
import { Stage1ClientService } from "../core/stage-services/client/stage1-client-service";
import { Stage2ClientService } from "../core/stage-services/client/stage2-client-service";
import { Stage3ClientService } from "../core/stage-services/client/stage3-client-service";
import {
  SATPService,
  SATPHandler,
  SATPServiceType,
  SATPHandlerOptions,
  SATPHandlerType,
  ISATPHandler,
  SATPHandlerInstance,
} from "../types/satp-protocol";
import {
  ISATPServiceOptions,
  SATPServiceInstance,
  SATPStagesV02,
} from "../core/stage-services/satp-service";
import { Stage2SATPHandler } from "../core/stage-handlers/stage2-handler";
import { Stage3SATPHandler } from "../core/stage-handlers/stage3-handler";
import { SATPBridgesManager } from "./satp-bridges-manager";
import { GatewayOrchestrator } from "./gateway-orchestrator";
import { SessionData } from "../generated/proto/cacti/satp/v02/common/session_pb";
//import { SatpStage0Service } from "../generated/proto/cacti/satp/v02/stage_0_connect";
import { SatpStage1Service } from "../generated/proto/cacti/satp/v02/stage_1_connect";
import { SatpStage2Service } from "../generated/proto/cacti/satp/v02/stage_2_connect";
import { SatpStage3Service } from "../generated/proto/cacti/satp/v02/stage_3_connect";
import { PromiseClient as PromiseConnectClient } from "@connectrpc/connect";
import { SatpStage0Service } from "../generated/proto/cacti/satp/v02/stage_0_connect";
import { Empty } from "@bufbuild/protobuf";

export interface ISATPManagerOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  sessions?: Map<string, SATPSession>;
  signer: JsObjectSigner;
  supportedDLTs: SupportedChain[];
  bridgeManager: SATPBridgesManager;
  orquestrator: GatewayOrchestrator;
}

export class SATPManager {
  public static readonly CLASS_NAME = "SATPManager";
  private readonly logger: Logger;
  private readonly instanceId: string;
  private endpoints: any[] | undefined;
  private signer: JsObjectSigner;
  public supportedDLTs: SupportedChain[] = [];
  private sessions: Map<string, SATPSession>;
  // maps stage to client/service and service class
  private readonly satpServices: Map<
    string,
    Map<SATPServiceType, SATPService>
  > = new Map();
  private readonly satpHandlers: Map<SATPHandlerType, SATPHandler> = new Map();

  private readonly bridgesManager: SATPBridgesManager;

  private readonly orquestrator: GatewayOrchestrator;

  constructor(public readonly options: ISATPManagerOptions) {
    const fnTag = `${SATPManager.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "DEBUG";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
    this.supportedDLTs = options.supportedDLTs;
    this.signer = options.signer;
    this.bridgesManager = options.bridgeManager;
    this.orquestrator = options.orquestrator;

    this.sessions = options.sessions || new Map<string, SATPSession>();
    const handlersClasses = [
      Stage0SATPHandler as unknown as SATPHandlerInstance,
      Stage1SATPHandler as unknown as SATPHandlerInstance,
      Stage2SATPHandler as unknown as SATPHandlerInstance,
      Stage3SATPHandler as unknown as SATPHandlerInstance,
    ];

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

  public getSessions(): Map<string, SATPSession> | undefined {
    return this.sessions;
  }

  public getSession(sessionId: string): SATPSession | undefined {
    if (this.sessions == undefined) {
      return undefined;
    }
    return this.sessions.get(sessionId);
  }

  get SupportedDLTs(): SupportedChain[] {
    return this.supportedDLTs;
  }

  public getSATPHandler(type: SATPHandlerType): SATPHandler | undefined {
    return this.satpHandlers.get(type);
  }

  public getOrCreateSession(
    sessionId?: string,
    contextID?: string,
  ): SATPSession {
    let session: SATPSession;
    if (!sessionId) {
      return this.createNewSession(contextID || "MOCK_CONTEXT_ID");
      return session;
    } else {
      const existingSession = this.sessions.get(sessionId);
      return existingSession || this.createNewSession("MOCK_CONTEXT_ID");
    }
  }

  private createNewSession(contextID: string): SATPSession {
    const session = new SATPSession({
      contextID: contextID,
      server: true, //todo implement the separation of server and client
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
          supportedDLTs: this.supportedDLTs,
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

  public async initiateTransfer(session: SATPSession): Promise<void> {
    const fnTag = `${SATPManager.CLASS_NAME}#initializeHandlers()`;
    this.logger.info(`${fnTag}, Initiating Transfer`);
    this.logger.debug(
      `SessionData: ${JSON.stringify(session.getClientSessionData())}`,
    );

    if (!session.getClientSessionData()) {
      throw new Error(`${fnTag}, Session not found`);
    }

    const channel = this.orquestrator.getChannel(
      session.getClientSessionData()
        ?.recipientGatewayNetworkId as SupportedChain,
    );

    if (!channel) {
      throw new Error(`${fnTag}, Channel not found`);
    }

    const sessionData: SessionData =
      session.getClientSessionData() as SessionData;

    const clientSatpStage0: PromiseConnectClient<typeof SatpStage0Service> =
      channel.clients.get("0") as PromiseConnectClient<
        typeof SatpStage0Service
      >;
    const clientSatpStage1: PromiseConnectClient<typeof SatpStage1Service> =
      channel.clients.get("1") as PromiseConnectClient<
        typeof SatpStage1Service
      >;
    const clientSatpStage2: PromiseConnectClient<typeof SatpStage2Service> =
      channel.clients.get("2") as PromiseConnectClient<
        typeof SatpStage2Service
      >;
    const clientSatpStage3: PromiseConnectClient<typeof SatpStage3Service> =
      channel.clients.get("3") as PromiseConnectClient<
        typeof SatpStage3Service
      >;

    const serverGatewayPubkey = (await clientSatpStage0.getPublicKey(Empty))
      .publicKey;

    if (!serverGatewayPubkey) {
      throw new Error(`${fnTag}, Failed to get serverGatewayPubkey`);
    }

    sessionData.serverGatewayPubkey = serverGatewayPubkey;

    this.logger.info(`${fnTag}, Stage 0`);

    const requestTransferProposal = await (
      this.getSATPHandler(SATPHandlerType.STAGE1) as Stage1SATPHandler
    ).TransferProposalRequest(session.getSessionId());

    if (!requestTransferProposal) {
      throw new Error(`${fnTag}, Failed to create TransferProposalRequest`);
    }

    const responseTransferProposal = await clientSatpStage1.transferProposal(
      requestTransferProposal,
    );

    this.logger.info(
      `${fnTag}, responseTransferProposal: ${JSON.stringify(responseTransferProposal)}`,
    );

    const requestTransferCommence = await (
      this.getSATPHandler(SATPHandlerType.STAGE1) as Stage1SATPHandler
    ).TransferCommenceRequest(responseTransferProposal);

    if (!requestTransferCommence) {
      throw new Error(`${fnTag}, Failed to create TransferCommenceRequest`);
    }

    const responseTransferCommence = await clientSatpStage1.transferCommence(
      requestTransferCommence,
    );

    this.logger.info(
      `${fnTag}, responseTransferCommence: ${JSON.stringify(responseTransferCommence)}`,
    );

    this.logger.info(`${fnTag}, Stage 1 completed`);

    const requestLockAssertion = await (
      this.getSATPHandler(SATPHandlerType.STAGE2) as Stage2SATPHandler
    ).LockAssertionRequest(responseTransferCommence);

    if (!requestLockAssertion) {
      throw new Error(`${fnTag}, Failed to create LockAssertionRequest`);
    }

    const responseLockAssertion =
      await clientSatpStage2.lockAssertion(requestLockAssertion);

    this.logger.info(
      `${fnTag}, responseLockAssertion: ${JSON.stringify(responseLockAssertion)}`,
    );

    this.logger.info(`${fnTag}, Stage 2 completed`);

    const requestCommitPreparation = await (
      this.getSATPHandler(SATPHandlerType.STAGE3) as Stage3SATPHandler
    ).CommitPreparationRequest(responseLockAssertion);

    if (!requestCommitPreparation) {
      throw new Error(`${fnTag}, Failed to create CommitPreparationRequest`);
    }

    const responseCommitPreparation = await clientSatpStage3.commitPreparation(
      requestCommitPreparation,
    );
    this.logger.info(
      `${fnTag}, responseCommitPreparation: ${JSON.stringify(responseCommitPreparation)}`,
    );

    const requestCommitFinalAssertion = await (
      this.getSATPHandler(SATPHandlerType.STAGE3) as Stage3SATPHandler
    ).CommitFinalAssertionRequest(responseLockAssertion);

    if (!requestCommitFinalAssertion) {
      throw new Error(`${fnTag}, Failed to create CommitFinalAssertionRequest`);
    }

    const responseCommitFinalAssertion =
      await clientSatpStage3.commitFinalAssertion(requestCommitFinalAssertion);
    this.logger.info(
      `${fnTag}, responseCommitFinalAssertion: ${JSON.stringify(responseCommitFinalAssertion)}`,
    );

    const RequestTransferComplete = await (
      this.getSATPHandler(SATPHandlerType.STAGE3) as Stage3SATPHandler
    ).TransferCompleteRequest(responseCommitFinalAssertion);

    if (!RequestTransferComplete) {
      throw new Error(`${fnTag}, Failed to create TransferCompleteRequest`);
    }

    const responseTransferComplete = await clientSatpStage3.transferComplete(
      RequestTransferComplete,
    );
    this.logger.info(
      `${fnTag}, responseTransferComplete: ${JSON.stringify(responseTransferComplete)}`,
    );

    this.logger.info(`${fnTag}, Stage 3 completed`);
  }
}
