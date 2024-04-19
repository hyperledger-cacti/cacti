import {
  Checks,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Stage1Handler } from "../../core/stage-handlers/stage1-handler";
import { Stage2Handler } from "../../core/stage-handlers/stage2-handler";
import { Stage3Handler } from "../../core/stage-handlers/stage3-handler";
import { Stage1ServerService } from "../../core/stage-services/server/stage1-server-service";
import { SATPGateway } from "../../gateway-refactor";
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
import { SATPService, ISATPServerServiceOptions } from "../../types/satp-protocol";
import { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/stage_0_connect";
import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/stage_2_connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/stage_3_connect";
import { PromiseClient as PromiseConnectClient, Transport as ConnectTransport, PromiseClient } from "@connectrpc/connect";

export interface ISATPManagerOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  sessions?: Map<string, SATPSession[]>;
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
  protected sessions?: Map<string, SATPSession[]>;

  private readonly stage1ServerService: SATPService;
  private readonly stage2ServerService: SATPService;
  private readonly stage3ServerService: SATPService;
  private readonly stage1ClientService: SATPService;
  private readonly stage2ClientService: SATPService;
  private readonly stage3ClientService: SATPService;

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

    this.sessions = options.sessions;

    const satpServiceOptions: ISATPServerServiceOptions = {
      signer: this.signer,
    };
      // create clients

    const satpServiceOptionsClient: ISATPServerServiceOptions = {
      signer: this.signer,

    };
    this.connectClients = options.connectClients;
    if (this.connectClients == undefined || this.connectClients.length == 0) {
      this.logger.warn("Connect clients not provided");
    }

    this.stage1ServerService = new Stage1ServerService(satpServiceOptions);
    this.stage2ServerService = new Stage2ServerService(satpServiceOptions);
    this.stage3ServerService = new Stage3ServerService(satpServiceOptions);
    this.stage1ClientService = new Stage1ClientService(satpServiceOptionsClient);
    this.stage2ClientService = new Stage2ClientService(satpServiceOptionsClient);
    this.stage3ClientService = new Stage3ClientService(satpServiceOptionsClient);

    /*
     Stage1Handler(this.sessions, this.stage1ServerService, this.stage1ClientService, this.connectClients),
      Stage2Handler(this.gateway, this.stage2Service),
      Stage3Handler(this.gateway, this.stage3Service),
    */	
  }

  public get className(): string {
    return SATPManager.CLASS_NAME;
  }

  public getSessions(): Map<string, SATPSession[]> | undefined {
    return this.sessions;
  }

  public getSession(sessionId: string): SATPSession[] | undefined {
    if (this.sessions == undefined) {
      return undefined;
    }
    return this.sessions.get(sessionId);
  }

  get SupportedDLTs(): SupportedGatewayImplementations[] {
    return this.supportedDLTs;
  }
  
  public addSession(sessionId: string, contextID: string): void {
    if (this.sessions == undefined) {
      this.sessions = new Map<string, SATPSession[]>();
    } else {
    const existingSessions = this.sessions.get(sessionId);
      const sessionOps: ISATPSessionOptions = {
          contextID: contextID,
        }; 
      if (existingSessions) {

        existingSessions.push(new SATPSession(sessionOps));
        this.sessions.set(sessionId, existingSessions);
      } else {
        this.sessions.set(sessionId, [new SATPSession(sessionOps)]);
      }
    }
  }

  getOrCreateServices() {
    const fnTag = `${SATPManager.CLASS_NAME}#getOrCreateServices()`;
    this.logger.info(
      `${fnTag}, Registering gRPCservices on instanceId=${this.instanceId}`,
    );
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    this.endpoints = [

    ];

    return this.endpoints;
  }

    get StageHandlers() {
      throw new Error("Not implemented yet");
  }

  // methods to dynamically add/remove connect clients

}
