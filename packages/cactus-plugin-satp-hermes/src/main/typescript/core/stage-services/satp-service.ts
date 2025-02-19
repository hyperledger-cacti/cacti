import {
  type JsObjectSigner,
  type Logger,
  LoggerProvider,
  type ILoggerOptions,
} from "@hyperledger/cactus-common";
import type { SATPCrossChainManager } from "../../cross-chain-mechanisms/satp-cc-manager";
import type { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import type { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import type { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import type { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import type { SATPLogger } from "../../logging";

export enum SATPServiceType {
  Server = "Server",
  Client = "Client",
}

export type SATPStagesV02 = "0" | "1" | "2" | "3";

export type ISATPServiceOptions = {
  serviceName: string;
  stage: SATPStagesV02;
  loggerOptions: ILoggerOptions;
  signer: JsObjectSigner;
  serviceType: SATPServiceType;
  bridgeManager?: SATPCrossChainManager;
  dbLogger: SATPLogger;
};

export interface SATPServiceStatic {
  new (options: ISATPServiceOptions): SATPService;
  readonly SERVICE_TYPE: SATPServiceType;
  readonly SATP_STAGE: string;
  // service name serves as an internal, hardcoded service name. One can assign a more user-friendly service name via the SATPService constructor
  readonly SATP_SERVICE_INTERNAL_NAME: string;
  get ServiceType(): SATPServiceType;
}

export type SATPServiceInstance =
  | (typeof SatpStage0Service & SATPServiceStatic)
  | (typeof SatpStage1Service & SATPServiceStatic)
  | (typeof SatpStage2Service & SATPServiceStatic)
  | (typeof SatpStage3Service & SATPServiceStatic);

export type ISATPServerServiceOptions = ISATPServiceOptions;

export type ISATPClientServiceOptions = ISATPServiceOptions;

/**
 * Interface for SATP Services.
 * Each service implementing this interface must provide one or more function(s) to handle specific stages of the SATP protocol.
 * Implementations should ensure compliance with the defined asynchronous patterns essential for SATP protocol interactions.
 */
export abstract class SATPService {
  readonly stage: string;
  readonly logger: Logger;
  readonly serviceType: SATPServiceType;
  private readonly signer: JsObjectSigner;
  readonly serviceName: string;
  public dbLogger: SATPLogger;

  constructor(ops: ISATPServiceOptions) {
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.serviceName = ops.serviceName;
    this.serviceType = ops.serviceType;
    this.stage = ops.stage;
    this.signer = ops.signer;
    if (!ops.dbLogger) {
      throw new Error("dbLogger is required for SATPService");
    }
    this.dbLogger = ops.dbLogger;
    this.logger.trace(`Signer logger level: ${this.signer.options.logLevel}`);
  }

  public getServiceIdentifier(): string {
    return `${this.serviceType}#${this.stage}`;
  }

  public get Stage(): string {
    return this.stage;
  }

  public get Log(): Logger {
    return this.logger;
  }

  public get ServiceType(): SATPServiceType {
    return this.serviceType;
  }

  public get ServiceName(): string {
    return this.serviceName;
  }

  public get Signer(): JsObjectSigner {
    return this.signer;
  }
}
