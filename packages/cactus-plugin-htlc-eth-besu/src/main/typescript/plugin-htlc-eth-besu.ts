import {
  NewContractObj,
  DefaultApi,
} from "./generated/openapi/typescript-axios/index";
//TODO: import web-services
import { GetSingleStatusEndpoint } from "./web-services/getSingleStatus-endpoint";
import Client from "./client";
import { Express } from "express";
import { Optional } from "typescript-optional";
import { Server } from "http";
import { Server as SecureServer } from "https";

import {
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
  IWebServiceEndpoint,
  PluginAspect,
} from "@hyperledger/cactus-core-api";
import { Logger, LogLevelDesc } from "@hyperledger/cactus-common";

export interface IPluginHtlcEthBesuOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
}
export class PluginHtlcEthBesu implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginHtlcEthBesu";
  public get className() {
    return PluginHtlcEthBesu.CLASS_NAME;
  }
  private client: Client;
  private readonly instanceId: string;

  constructor(public readonly opts: IPluginHtlcEthBesuOptions) {
    this.client = new Client();
    this.instanceId = opts.instanceId;
  }
  /**
   * Feature is deprecated, we won't need this method in the future.
   */
  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  /**
   * Feature is deprecated, we won't need this method in the future.
   */
  public async shutdown(): Promise<void> {
    return;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-htlc-eth-besu";
  }

  public getAspect(): PluginAspect {
    return PluginAspect.CONSORTIUM;
    //return PluginAspect.ATOMIC_SWAP;
  }

  public async installWebServices(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new GetSingleStatusEndpoint({
        logLevel: this.opts.logLevel,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    //TODO: add other endpoints.

    return endpoints;
  }
}
