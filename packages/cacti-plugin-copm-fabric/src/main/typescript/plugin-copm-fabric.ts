import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import {
  ICactusPluginOptions,
  ICrpcSvcRegistration,
  IPluginCrpcService,
} from "@hyperledger/cactus-core-api";
import { ServiceType } from "@bufbuild/protobuf";
import {
  DefaultService,
  CopmContractNames,
  Interfaces as CopmIF,
} from "@hyperledger/cacti-copm-core";
import { CopmFabricImpl } from "./service-implementation";
import { FabricTransactionContextFactory } from "./lib/fabric-context-factory";
import { FabricConfiguration } from "./lib/fabric-configuration";

export interface IPluginCopmFabricOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  fabricConfig: FabricConfiguration;
  interopConfig: CopmIF.InteropConfiguration;
  contractNames: CopmContractNames;
}

export class PluginCopmFabric implements IPluginCrpcService {
  public static readonly CLASS_NAME = "PluginCopmFabric";
  private readonly instanceId: string;
  private readonly logLevel: LogLevelDesc;
  private contextFactory: FabricTransactionContextFactory;
  private copmContractNames: CopmContractNames;
  private readonly log: Logger;

  constructor(public readonly opts: IPluginCopmFabricOptions) {
    this.logLevel = opts.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: "CopmFabricImpl",
    });

    this.contextFactory = new FabricTransactionContextFactory(
      opts.fabricConfig,
      opts.interopConfig,
      this.log,
    );
    this.copmContractNames = opts.contractNames;
    this.instanceId = this.opts.instanceId;
  }

  public async createCrpcSvcRegistrations(): Promise<
    ICrpcSvcRegistration<ServiceType>[]
  > {
    const out: ICrpcSvcRegistration<ServiceType>[] = [];

    const implementation = new CopmFabricImpl(
      this.log,
      this.contextFactory,
      this.copmContractNames,
    );

    const crpcSvcRegistration: ICrpcSvcRegistration<ServiceType> = {
      definition: DefaultService,
      serviceName: DefaultService.typeName,
      implementation,
    };
    out.push(crpcSvcRegistration);
    return out;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cacti-plugin-copm-fabric`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }
}
