import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import express, { Express, Application } from "express";
import { OpenApiValidator } from "express-openapi-validator";
import compression from "compression";
import bodyParser from "body-parser";

import {
  IPluginWebService,
  PluginAspect,
  PluginRegistry,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

import { BesuSignTransactionEndpointV1 } from "./besu/sign-transaction-endpoint-v1";
import { CACTUS_OPEN_API_JSON } from "./openapi-spec";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IPluginValidatorBesuOptions extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  keyPairPem: string;
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
}

export class PluginValidatorBesu implements ICactusPlugin, IPluginWebService {
  private readonly instanceId: string;
  private readonly log: Logger;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginValidatorBesuOptions) {
    const fnTag = "PluginValidatorBesu#constructor()";
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    if (!options.rpcApiHttpHost) {
      throw new Error(`${fnTag} options.rpcApiHttpHost falsy.`);
    }
    if (!options.keyPairPem) {
      throw new Error(`${fnTag} options.keyPairPem falsy.`);
    }
    if (!options.pluginRegistry) {
      throw new Error(`${fnTag} options.pluginRegistry falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag}#options.instanceId`);

    this.log = LoggerProvider.getOrCreate({
      label: "plugin-validator-besu",
      level: options.logLevel || "INFO",
    });
    this.instanceId = options.instanceId;
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

    const app: Application = express();
    app.use(compression());
    app.use(bodyParser.json({ limit: "50mb" }));

    const openApiValidator = this.createOpenApiValidator();
    await openApiValidator.install(app);

    const { rpcApiHttpHost, keyPairPem } = this.options;
    const packageName = this.getPackageName();

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const path = `/api/v1/plugins/${packageName}/sign-transaction`;
      const options = { rpcApiHttpHost, keyPairPem, path };
      const endpoint = new BesuSignTransactionEndpointV1(options);
      webApp.post(endpoint.getPath(), endpoint.getExpressRequestHandler());
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
    return `@hyperledger/cactus-plugin-validator-besu`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.VALIDATOR;
  }

  createOpenApiValidator(): OpenApiValidator {
    return new OpenApiValidator({
      apiSpec: CACTUS_OPEN_API_JSON,
      validateRequests: true,
      validateResponses: false,
    });
  }
}
