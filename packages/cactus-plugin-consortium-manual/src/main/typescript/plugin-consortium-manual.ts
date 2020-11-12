import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import express, { Express } from "express";
import bodyParser from "body-parser";

import {
  Consortium,
  IPluginWebService,
  PluginAspect,
  PluginRegistry,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { GetConsortiumEndpointV1 } from "./consortium/get-consortium-jws-endpoint-v1";
import { GetNodeJwsEndpoint } from "./consortium/get-node-jws-endpoint-v1";
import uuid from "uuid";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IPluginConsortiumManualOptions extends ICactusPluginOptions {
  keyPairPem: string;
  consortium: Consortium;
  pluginRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
}

export class PluginConsortiumManual
  implements ICactusPlugin, IPluginWebService {
  private readonly log: Logger;
  private readonly instanceId: string;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginConsortiumManualOptions) {
    const fnTag = `PluginConsortiumManual#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-consortium-manual",
    });
    this.instanceId = this.options.instanceId;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down...`);
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      this.log.info(`Awaiting server.close() ...`);
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
      this.log.info(`server.close() OK`);
    } else {
      this.log.info(`No HTTP server found, skipping...`);
    }
  }

  public async installWebServices(
    expressApp: any
  ): Promise<IWebServiceEndpoint[]> {
    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);
    const webApp: Express = this.options.webAppOptions ? express() : expressApp;

    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on
    if (this.options.webAppOptions) {
      this.log.info(`Creating dedicated HTTP server...`);
      const { port, hostname } = this.options.webAppOptions;

      webApp.use(bodyParser.json({ limit: "50mb" }));

      const address = await new Promise((resolve, reject) => {
        const httpServer = webApp.listen(port, hostname, (err?: any) => {
          if (err) {
            reject(err);
            this.log.error(`Failed to create dedicated HTTP server`, err);
          } else {
            this.httpServer = httpServer;
            const theAddress = this.httpServer.address();
            resolve(theAddress);
          }
        });
      });
      this.log.info(`Creation of HTTP server OK`, { address });
    }

    const { consortium, keyPairPem } = this.options;
    const packageName = this.getPackageName();

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const path = `/api/v1/plugins/${packageName}/consortium/jws`;
      const options = { path, keyPairPem, consortium };
      const endpoint = new GetConsortiumEndpointV1(options);
      webApp.get(endpoint.getPath(), endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
      this.log.info(`Registered contract deployment endpoint at ${path}`);
    }
    {
      const path = `/api/v1/plugins/${packageName}/node/jws`;
      const options = { path, keyPairPem, consortium };
      const endpoint = new GetNodeJwsEndpoint(options);
      webApp.get(endpoint.getPath(), endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
      this.log.info(`Registered contract deployment endpoint at ${path}`);
    }

    log.info(`Installed web svcs for plugin ${this.getPackageName()} OK`, {
      endpoints,
    });
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-consortium-manual`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.CONSORTIUM;
  }
}
