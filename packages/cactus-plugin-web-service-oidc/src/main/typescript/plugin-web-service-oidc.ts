import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import express, { Express } from "express";
import bodyParser from "body-parser";
import {
  Provider,
  Configuration as OidcProviderConfiguration,
} from "oidc-provider";

import {
  IPluginWebService,
  PluginAspect,
  PluginRegistry,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { OpenIdConfigurationEndpointV1 } from "./oidc/open-id-configuration-endpoint-v1";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IPluginWebServiceOidcOptions {
  issuer: string;
  oidcProviderConfig: OidcProviderConfiguration;
  pluginRegistry: PluginRegistry;
  logLevel?: string;
  webAppOptions?: IWebAppOptions;
}

export class PluginWebServiceOidc implements IPluginWebService {
  private readonly log: Logger;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginWebServiceOidcOptions) {
    if (!options) {
      throw new Error(`PluginWebServiceOidc#ctor options falsy.`);
    }
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-web-service-oidc",
    });
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
    this.log.info(`Installing web services for plugin ${this.getId()}...`);
    const webApp: Express = this.options.webAppOptions ? express() : expressApp;

    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on
    if (this.options.webAppOptions) {
      this.log.info(`Creating dedicated HTTP server...`);
      const { port, hostname } = this.options.webAppOptions;

      webApp.use(bodyParser.json({ limit: "50mb" }));

      const address = await new Promise((resolve, reject) => {
        const httpServer = webApp.listen(port, hostname, (err: any) => {
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

    const oidcProvider = new Provider(
      this.options.issuer,
      this.options.oidcProviderConfig
    );
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const pluginId = this.getId();
      const path = `/api/v1/plugins/${pluginId}/.well-known/openid-configuration`;
      const endpointOptions = { oidcProvider, hostPlugin: this, path };
      const endpoint = new OpenIdConfigurationEndpointV1(endpointOptions);
      webApp.post(endpoint.getPath(), endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
      this.log.info(`Registered contract deployment endpoint at ${path}`);
    }

    this.log.info(`Installed web services for plugin ${this.getId()} OK`, {
      endpoints,
    });
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getId(): string {
    return `@hyperledger/cactus-plugin-web-service-oidc`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.WEB_SERVICE;
  }
}
