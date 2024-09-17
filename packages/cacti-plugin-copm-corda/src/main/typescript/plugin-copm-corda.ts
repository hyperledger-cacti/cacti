import {
  IPluginCrpcService,
  ICactusPluginOptions,
  ICactusPlugin,
} from "@hyperledger/cactus-core-api";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { ICrpcSvcRegistration } from "@hyperledger/cactus-core-api";
import { ServiceType } from "@bufbuild/protobuf";
import { DefaultService } from "@hyperledger-cacti/cacti-copm-core";
import { CopmCordaImpl, DefaultApi } from "./service-implementation";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { createPromiseClient } from "@connectrpc/connect";

export interface IPluginCopmCordaOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  copmKotlinServerBaseUrl: string;
}

export class PluginCopmCorda implements IPluginCrpcService, ICactusPlugin {
  public static readonly CLASS_NAME = "PluginCopmCorda";
  private readonly instanceId: string;
  private readonly logLevel: LogLevelDesc;
  private readonly log: Logger;
  private readonly options: IPluginCopmCordaOptions;

  constructor(public readonly opts: IPluginCopmCordaOptions) {
    this.logLevel = opts.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: "CopmCordaImpl",
    });
    this.options = opts;
    this.instanceId = this.opts.instanceId;
  }

  public async createCrpcSvcRegistrations(): Promise<
    ICrpcSvcRegistration<ServiceType>[]
  > {
    const out: ICrpcSvcRegistration<ServiceType>[] = [];
    //await this.copmCordaContainer.start();

    const transport = createGrpcTransport({
      // Requests will be made to <baseUrl>/<package>.<service>/method
      baseUrl: this.opts.copmKotlinServerBaseUrl,
      httpVersion: "2",
    });
    const containerApi = createPromiseClient(DefaultService, transport);

    const implementation = new CopmCordaImpl(
      this.log,
      containerApi as DefaultApi,
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
    return `@hyperledger-cacti/cacti-plugin-copm-corda`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }
}
