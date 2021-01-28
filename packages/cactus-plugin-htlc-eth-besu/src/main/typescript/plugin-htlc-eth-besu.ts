import {
  NewContractObj,
  DefaultApi,
} from "./generated/openapi/typescript-axios/index";
//TODO: import web-services
import { GetSingleStatusEndpoint } from "./web-services/getSingleStatus-endpoint";
import Client from "./client";
import { Express } from "express";
import {
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { Logger, LogLevelDesc } from "@hyperledger/cactus-common";

export interface IPluginHtlcEthBesuOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
}
export class PluginHtlcEthBesu implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginHtlcEthBesu";
  private readonly log: Logger;
  public get className() {
    return PluginHtlcEthBesu.CLASS_NAME;
  }
  private client: Client;
  constructor(public readonly opts: IPluginHtlcEthBesuOptions) {
    const fnTag = `${this.className}#constructor()`;
    this.client = new Client();
  }
  public async installWebServices(
    expressApp: Express
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
