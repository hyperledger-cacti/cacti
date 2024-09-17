import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  ICactusPluginOptions,
  ICrpcSvcRegistration,
  IPluginCrpcService,
} from "@hyperledger/cactus-core-api";
import { ServiceType } from "@bufbuild/protobuf";
import {
  DefaultService,
  Interfaces as CopmIF,
} from "@hyperledger-cacti/cacti-copm-core";
import { CopmFabricImpl } from "./service-implementation";
import { FabricConfiguration } from "./lib/fabric-configuration";

export interface IPluginCopmFabricOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  fabricConfig: FabricConfiguration;
  interopConfig: CopmIF.InteropConfiguration;
}

export class PluginCopmFabric implements IPluginCrpcService, ICactusPlugin {
  public static readonly CLASS_NAME = "PluginCopmFabric";
  private readonly instanceId: string;
  private readonly logLevel: LogLevelDesc;
  private readonly opts: IPluginCopmFabricOptions;
  private readonly log: Logger;

  constructor(opts: IPluginCopmFabricOptions) {
    this.logLevel = opts.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: "CopmFabricImpl",
    });
    this.opts = opts;
    this.instanceId = this.opts.instanceId;
  }

  public async createCrpcSvcRegistrations(): Promise<
    ICrpcSvcRegistration<ServiceType>[]
  > {
    const out: ICrpcSvcRegistration<ServiceType>[] = [];

    const implementation = new CopmFabricImpl(
      this.log,
      this.opts.interopConfig,
      this.opts.fabricConfig,
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
    return `@hyperledger-cacti/cacti-plugin-copm-fabric`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }
}
