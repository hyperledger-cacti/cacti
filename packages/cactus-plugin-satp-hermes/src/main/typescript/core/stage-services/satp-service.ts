import {
  JsObjectSigner,
  Logger,
  LoggerProvider,
  ILoggerOptions,
} from "@hyperledger/cactus-common";
import { SATPBridgesManager } from "../../gol/satp-bridges-manager";

export enum SATPServiceType {
  Server,
  Client,
}

export type ISATPServiceOptions = {
  serviceName: string;
  stage: "0" | "1" | "2" | "3";
  loggerOptions: ILoggerOptions;
  signer: JsObjectSigner;
  serviceType: SATPServiceType;
  bridgeManager?: SATPBridgesManager;
};

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

  constructor(ops: ISATPServiceOptions) {
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.serviceName = ops.serviceName;
    this.serviceType = ops.serviceType;
    this.stage = ops.stage;
    this.signer = ops.signer;
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
