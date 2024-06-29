import {
  Checks,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Stage1SATPHandler } from "../core/stage-handlers/stage1-handler";
import { Stage1ServerService } from "../core/stage-services/server/stage1-server-service";
import { Stage2ServerService } from "../core/stage-services/server/stage2-server-service";
import { Stage3ServerService } from "../core/stage-services/server/stage3-server-service";
import { SATPSession } from "../core/satp-session";
import { SupportedChain } from "../core/types";
import { Stage1ClientService } from "../core/stage-services/client/stage1-client-service";
import { Stage2ClientService } from "../core/stage-services/client/stage2-client-service";
import { Stage3ClientService } from "../core/stage-services/client/stage3-client-service";
import {
  SATPService,
  SATPHandler,
  SATPServiceType,
  SATPHandlerOptions,
} from "../types/satp-protocol";
import { ISATPServiceOptions } from "../core/stage-services/satp-service";
import { Stage2SATPHandler } from "../core/stage-handlers/stage2-handler";
import { Stage3SATPHandler } from "../core/stage-handlers/stage3-handler";
import { SATPBridgesManager } from "./satp-bridges-manager";

export interface ISATPManagerOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  sessions?: Map<string, SATPSession>;
  signer: JsObjectSigner;
  supportedDLTs: SupportedChain[];
  bridgeManager: SATPBridgesManager;
}

export class SATPManager {
  public static readonly CLASS_NAME = "SATPManager";
  private readonly logger: Logger;
  private readonly instanceId: string;
  private endpoints: any[] | undefined;
  private signer: JsObjectSigner;
  public supportedDLTs: SupportedChain[] = [];
  private sessions: Map<string, SATPSession>;
  private handlers: SATPHandler[] = [];

  private readonly bridgeManager: SATPBridgesManager;

  private readonly satpServices: SATPService[] = [];
  private readonly satpHandlers: Map<string, Map<string, SATPHandler>> =
    new Map();

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
    this.bridgeManager = options.bridgeManager;

    this.sessions = options.sessions || new Map<string, SATPSession>();
    const handlersClasses = [
      Stage1SATPHandler,
      Stage2SATPHandler,
      Stage3SATPHandler,
    ];

    const serviceClasses = [
      Stage1ServerService,
      Stage1ClientService,
      Stage2ServerService,
      Stage2ClientService,
      Stage3ServerService,
      Stage3ClientService,
    ];

    const serviceOptions = this.initializeServiceOptions(
      serviceClasses,
      level,
      label,
    );
    this.satpServices = this.initializeServices(serviceClasses, serviceOptions);

    const mockSession = this.getOrCreateSession();

    if (serviceClasses.length % 2 !== 0) {
      throw new Error(
        "Invalid number of service classes. Each handler needs one server and one client service.",
      );
    }
    const handlersOptions = this.initializeHandlerOptions(
      serviceClasses,
      level,
    );

    this.handlers = this.initializeHandlers(handlersClasses, handlersOptions);

    for (const handler of this.handlers) {
      const sessionId = mockSession.getSessionData().id;
      const handlerMap = this.satpHandlers.get(sessionId);
      if (handlerMap == undefined) {
        this.satpHandlers.set(sessionId, new Map());
      }
      this.satpHandlers
        .get(sessionId)
        ?.set(handler.getHandlerIdentifier(), handler);
    }
  }

  public getServiceByStage(
    serviceType: SATPServiceType,
    stageId: string,
  ): SATPService {
    if (isNaN(Number(stageId))) {
      throw new Error("Invalid stageId");
    }

    const service = this.satpServices.find(
      (service) =>
        service.serviceType === serviceType && service.stage === stageId,
    );
    if (service == undefined) {
      throw new Error(
        `Service not found for stageId=${stageId} and serviceType=${serviceType}`,
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

  public getSATPHandlers(
    sessionId: string,
  ): Map<string, SATPHandler> | undefined {
    return this.satpHandlers.get(sessionId);
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
    const session = new SATPSession({ contextID: contextID });
    this.sessions?.set(session.getSessionData().id, session);
    return session;
  }

  getOrCreateServices() {
    const fnTag = `${SATPManager.CLASS_NAME}#getOrCreateServices()`;
    this.logger.info(
      `${fnTag}, Registering gRPCservices on instanceId=${this.instanceId}`,
    );
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    this.endpoints = this.handlers;
    return this.endpoints;
  }

  get StageHandlers() {
    throw new Error("Not implemented yet");
  }

  private initializeServiceOptions(
    serviceClasses: (new (options: ISATPServiceOptions) => SATPService)[],
    logLevel: LogLevelDesc,
    label: string,
  ): ISATPServiceOptions[] {
    return serviceClasses.map((_, index) => ({
      signer: this.signer,
      stage: index.toString() as "0" | "1" | "2" | "3",
      loggerOptions: { level: logLevel, label },
      serviceName: `Service-${index}`,
      serviceType:
        index % 2 === 0 ? SATPServiceType.Server : SATPServiceType.Client,
      bridgeManager: this.bridgeManager,
    }));
  }

  private initializeServices(
    serviceClasses: (new (options: ISATPServiceOptions) => SATPService)[],
    serviceOptions: ISATPServiceOptions[],
  ): SATPService[] {
    return serviceClasses.map(
      (ServiceClass, index) => new ServiceClass(serviceOptions[index]),
    );
  }

  private initializeHandlerOptions(
    serviceClasses: (new (options: ISATPServiceOptions) => SATPService)[],
    level: LogLevelDesc = "DEBUG",
  ): SATPHandlerOptions[] {
    const handlersOptions: SATPHandlerOptions[] = [];
    const mockSession = this.getOrCreateSession();

    try {
      for (let i = 0; i < serviceClasses.length / 2; i++) {
        const serverService = this.getServiceByStage(
          SATPServiceType.Server,
          i.toString(),
        );

        const clientService = this.getServiceByStage(
          SATPServiceType.Client,
          i.toString(),
        );

        const handlerOptions: SATPHandlerOptions = {
          session: mockSession,
          serverService: serverService,
          clientService: clientService,
          supportedDLTs: this.supportedDLTs,
          loggerOptions: { level: level, label: `SATPHandler-Stage${i}` },
        };
        handlersOptions.push(handlerOptions);
      }
    } catch (error) {
      this.logger.error(`Error creating handler options: ${error}`);
    }

    return handlersOptions;
  }

  private initializeHandlers(
    handlersClasses: (new (options: SATPHandlerOptions) => SATPHandler)[],
    handlersOptions: SATPHandlerOptions[],
  ): SATPHandler[] {
    const handlers: SATPHandler[] = [];
    if (handlersClasses.length === 0) {
      throw new Error("No handlers provided");
    }

    if (handlersOptions.length === 0) {
      throw new Error("No handler options provided");
    }

    if (handlersClasses.length !== handlersOptions.length) {
      throw new Error(
        "Number of handler classes and options do not match. Each handler class needs an options object.",
      );
    }

    handlersOptions.forEach((options, index) => {
      if (index < handlersClasses.length) {
        const HandlerClass = handlersClasses[index];
        const handler = new HandlerClass(options);
        handlers.push(handler);
      }
    });

    return handlers;
  }
}
