import {
  Checks,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Stage1SATPHandler } from "../../core/stage-handlers/stage1-handler";
import { Stage2Handler } from "../../core/stage-handlers/stage2-handler";
import { Stage3Handler } from "../../core/stage-handlers/stage3-handler";
import { Stage1ServerService } from "../../core/stage-services/server/stage1-server-service";
import { SATPGateway } from "../../plugin-satp-hermes-gateway";
import { Stage2ServerService } from "../../core/stage-services/server/stage2-server-service";
import { Stage3ServerService } from "../../core/stage-services/server/stage3-server-service";
import { ISATPSessionOptions, SATPSession } from "../../core/satp-session";
import { ConnectRouter, createPromiseClient  } from "@connectrpc/connect";
import { ServiceType } from "@bufbuild/protobuf";
import { SupportedGatewayImplementations } from "../../core/types";
import { Stage1ClientService } from "../../core/stage-services/client/stage1-client-service";
import { Stage2ClientService } from "../../core/stage-services/client/stage2-client-service";
import { Stage3ClientService } from "../../core/stage-services/client/stage3-client-service";
import { createConnectTransport } from "@connectrpc/connect-node";
import { SATPService, ISATPServerServiceOptions, ISATPServiceOptions, SATPHandler, SATPServiceType } from "../../types/satp-protocol";
import { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/stage_0_connect";
import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/stage_2_connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/stage_3_connect";
import { PromiseClient as PromiseConnectClient, Transport as ConnectTransport, PromiseClient } from "@connectrpc/connect";
import { Session } from "inspector";

export interface ISATPManagerOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  sessions?: Map<string, SATPSession>;
  signer: JsObjectSigner;
  supportedDLTs: SupportedGatewayImplementations[];
  connectClients: PromiseConnectClient<SATPServiceClient>[];
}

type SATPConnectHandler = (gateway: SATPGateway, service: SATPService) => (router: ConnectRouter) => void;

export type SATPServiceClient = typeof SatpStage0Service | typeof SatpStage1Service | typeof SatpStage2Service | typeof SatpStage3Service;

export class SATPManager {
  public static readonly CLASS_NAME = "SATPManager";
  private readonly logger: Logger;
  private readonly instanceId: string;
  private endpoints: any[] | undefined;
  private signer: JsObjectSigner;
  private connectClients: PromiseConnectClient<SATPServiceClient>[];
  public supportedDLTs: SupportedGatewayImplementations[] = [];
  private sessions: Map<string, SATPSession>;

  private readonly satpServices: SATPService[] = [];
  private readonly satpHandlers: SATPHandler[] = [];

    constructor(
      public readonly options: ISATPManagerOptions,
    ) {
      const fnTag = `${SATPManager.CLASS_NAME}#constructor()`;
      Checks.truthy(options, `${fnTag} arg options`);

      const level = this.options.logLevel || "DEBUG";
      const label = this.className;
      this.logger = LoggerProvider.getOrCreate({ level, label });
      this.instanceId = options.instanceId;
      this.logger.info(`Instantiated ${this.className} OK`);
      this.supportedDLTs = options.supportedDLTs;
      this.signer = options.signer;

      this.sessions = options.sessions || new Map<string, SATPSession>();

      this.connectClients = options.connectClients;
      if (this.connectClients == undefined || this.connectClients.length == 0) {
        this.logger.warn("Connect clients not provided");
      }

      const serviceClasses = [Stage1ServerService, Stage2ServerService, Stage3ServerService, Stage1ClientService, Stage2ClientService, Stage3ClientService];
      const satpServiceOptions: ISATPServiceOptions = { signer: this.signer, logLevel: level };
      this.satpServices = serviceClasses.map(ServiceClass => new ServiceClass(satpServiceOptions));
      
      let mockSession = this.getOrCreateSession()
      const stage1Handler = new Stage1SATPHandler(mockSession, this.getServiceByStage(SATPServiceType.Server, "stage-1"), this.getServiceByStage(SATPServiceType.Client, "stage-1"), this.supportedDLTs);
      stage1Handler.setupRouter(router);        
      
      
    }

  public getServiceByStage(serviceType: SATPServiceType, stageId: string): any {
    return this.satpServices.find(service => 
      service.serviceType === serviceType && 
      service.stage === stageId
    );
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

  get SupportedDLTs(): SupportedGatewayImplementations[] {
    return this.supportedDLTs;
  }
  
  public getOrCreateSession(sessionId?: string, contextID?: string): SATPSession {
    let session: SATPSession;
    if (!sessionId) {
      return this.createNewSession(contextID || "MOCK_CONTEXT_ID");
      return session;
    } else  {
      let existingSession = this.sessions.get(sessionId);
      return existingSession || this.createNewSession("MOCK_CONTEXT_ID");
    }
   }
  
   private createNewSession(contextID: string): SATPSession  {
      let session = new SATPSession({ contextID: contextID });
      this.sessions?.set(session.getSessionData().id, session);
      return session
   }

  getOrCreateServices() {
    const fnTag = `${SATPManager.CLASS_NAME}#getOrCreateServices()`;
    this.logger.info(
      `${fnTag}, Registering gRPCservices on instanceId=${this.instanceId}`,
    );
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    this.endpoints = this.satpHandlers;
    return this.endpoints;
  }

    get StageHandlers() {
      throw new Error("Not implemented yet");
  }
}
