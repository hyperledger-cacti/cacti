import path from "path";
import { AddressInfo } from "net";
import { Server, createServer } from "http";
import { Server as SecureServer } from "https";
import express, {
  Express,
  Request,
  Response,
  RequestHandler,
  Application,
} from "express";
import { OpenApiValidator } from "express-openapi-validator";
import compression from "compression";
import bodyParser from "body-parser";
import cors, { CorsOptions } from "cors";
import {
  PluginFactory,
  ICactusPlugin,
  isIPluginWebService,
  IPluginWebService,
  PluginRegistry,
} from "@hyperledger/cactus-core-api";
import { ICactusApiServerOptions as ICactusApiServerConfig } from "./config/config-service";
import { CACTUS_OPEN_API_JSON } from "./openapi-spec";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { Servers } from "./common/servers";

export interface IApiServerConstructorOptions {
  pluginRegistry?: PluginRegistry;
  httpServerApi?: Server | SecureServer;
  httpServerCockpit?: Server | SecureServer;
  config: ICactusApiServerConfig;
}

export class ApiServer {
  private readonly log: Logger;
  private pluginRegistry: PluginRegistry | undefined;
  private readonly httpServerApi: Server | SecureServer;
  private readonly httpServerCockpit: Server | SecureServer;

  constructor(public readonly options: IApiServerConstructorOptions) {
    if (!options) {
      throw new Error(`ApiServer#ctor options was falsy`);
    }
    if (!options.config) {
      throw new Error(`ApiServer#ctor options.config was falsy`);
    }
    this.httpServerApi = this.options.httpServerApi || createServer();
    this.httpServerCockpit = this.options.httpServerCockpit || createServer();

    this.log = LoggerProvider.getOrCreate({
      label: "api-server",
      level: options.config.logLevel,
    });
  }

  async start(): Promise<any> {
    try {
      const addressInfoCockpit = await this.startCockpitFileServer();
      const addressInfoApi = await this.startApiServer();
      return { addressInfoCockpit, addressInfoApi };
    } catch (ex) {
      const errorMessage = `Failed to start ApiServer: ${ex.stack}`;
      this.log.error(errorMessage);
      this.log.error(`Attempting shutdown...`);
      await this.shutdown();
      this.log.info(`Server shut down OK`);
      throw new Error(errorMessage);
    }
  }

  public getHttpServerApi(): Server | SecureServer {
    return this.httpServerApi;
  }

  public getHttpServerCockpit(): Server | SecureServer {
    return this.httpServerCockpit;
  }

  public async getOrInitPluginRegistry(): Promise<PluginRegistry> {
    if (!this.pluginRegistry) {
      if (!this.options.pluginRegistry) {
        this.log.info(`getOrInitPluginRegistry() initializing a new one...`);
        this.pluginRegistry = await this.initPluginRegistry();
      } else {
        this.log.info(`getOrInitPluginRegistry() re-using injected one...`);
        this.pluginRegistry = this.options.pluginRegistry;
      }
    }
    return this.pluginRegistry;
  }

  public async initPluginRegistry(): Promise<PluginRegistry> {
    const registry = new PluginRegistry({ plugins: [] });

    this.log.info(`Instantiated empty registry, invoking plugin factories...`);
    for (const pluginImport of this.options.config.plugins) {
      const { packageName, options } = pluginImport;
      this.log.info(`Creating plugin from package: ${packageName}`, options);
      const pluginOptions = { ...options, pluginRegistry: registry };
      const { createPluginFactory } = await import(packageName);
      const pluginFactory: PluginFactory<
        ICactusPlugin,
        any
      > = await createPluginFactory();
      const plugin = await pluginFactory.create(pluginOptions);
      registry.add(plugin);
    }

    return registry;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down API server ...`);

    const registry = await this.getOrInitPluginRegistry();

    const webServicesShutdown = registry
      .getPlugins()
      .filter((pluginInstance) => isIPluginWebService(pluginInstance))
      .map((pluginInstance: ICactusPlugin) => {
        return (pluginInstance as IPluginWebService).shutdown();
      });

    this.log.info(`Stopping ${webServicesShutdown.length} WS plugin(s)...`);
    await Promise.all(webServicesShutdown);
    this.log.info(`Stopped ${webServicesShutdown.length} WS plugin(s) OK`);

    if (this.httpServerApi) {
      this.log.info(`Closing HTTP server of the API...`);
      await Servers.shutdown(this.httpServerApi);
      this.log.info(`Close HTTP server of the API OK`);
    }

    if (this.httpServerCockpit) {
      this.log.info(`Closing HTTP server of the cockpit ...`);
      await Servers.shutdown(this.httpServerCockpit);
      this.log.info(`Close HTTP server of the cockpit OK`);
    }
  }

  async startCockpitFileServer(): Promise<AddressInfo> {
    const cockpitWwwRoot = this.options.config.cockpitWwwRoot;
    this.log.info(`wwwRoot: ${cockpitWwwRoot}`);

    const resolvedWwwRoot = path.resolve(process.cwd(), cockpitWwwRoot);
    this.log.info(`resolvedWwwRoot: ${resolvedWwwRoot}`);

    const resolvedIndexHtml = path.resolve(resolvedWwwRoot + "/index.html");
    this.log.info(`resolvedIndexHtml: ${resolvedIndexHtml}`);

    const app: Express = express();
    app.use(compression());
    app.use(express.static(resolvedWwwRoot));
    app.get("/*", (_, res) => res.sendFile(resolvedIndexHtml));

    const cockpitPort: number = this.options.config.cockpitPort;
    const cockpitHost: string = this.options.config.cockpitHost;

    if (!this.httpServerCockpit.listening) {
      await new Promise((resolve, reject) => {
        this.httpServerCockpit.once("error", reject);
        this.httpServerCockpit.once("listening", resolve);
        this.httpServerCockpit.listen(cockpitPort, cockpitHost);
      });
    }
    this.httpServerCockpit.on("request", app);

    // the address() method returns a string for unix domain sockets and null
    // if the server is not listening but we don't car about any of those cases
    // so the casting here should be safe. Famous last words... I know.
    const addressInfo = this.httpServerCockpit.address() as AddressInfo;
    this.log.info(`Cactus Cockpit net.AddressInfo`, addressInfo);

    const httpUrl = `http://${addressInfo.address}:${addressInfo.port}`;
    this.log.info(`Cactus Cockpit UI reachable ${httpUrl}`);

    return addressInfo;
  }

  async startApiServer(): Promise<AddressInfo> {
    const app: Application = express();
    app.use(compression());

    const corsMiddleware = this.createCorsMiddleware();
    app.use(corsMiddleware);

    app.use(bodyParser.json({ limit: "50mb" }));

    const openApiValidator = this.createOpenApiValidator();
    await openApiValidator.install(app);

    const healthcheckHandler = (req: Request, res: Response) => {
      res.json({
        success: true,
        createdAt: new Date(),
        memoryUsage: process.memoryUsage(),
      });
    };
    app.get("/api/v1/api-server/healthcheck", healthcheckHandler);

    const registry = await this.getOrInitPluginRegistry();

    this.log.info(`Starting to install web services...`);

    const webServicesInstalled = registry
      .getPlugins()
      .filter((pluginInstance) => isIPluginWebService(pluginInstance))
      .map((pluginInstance: ICactusPlugin) => {
        return (pluginInstance as IPluginWebService).installWebServices(app);
      });

    const endpoints2D = await Promise.all(webServicesInstalled);
    this.log.info(`Installed ${webServicesInstalled.length} web service(s) OK`);

    const endpoints = endpoints2D.reduce((acc, val) => acc.concat(val), []);
    endpoints.forEach((ep) => this.log.info(`Endpoint={path=${ep.getPath()}}`));

    const apiPort: number = this.options.config.apiPort;
    const apiHost: string = this.options.config.apiHost;

    if (!this.httpServerApi.listening) {
      await new Promise((resolve, reject) => {
        this.httpServerApi.once("error", reject);
        this.httpServerApi.once("listening", resolve);
        this.httpServerApi.listen(apiPort, apiHost);
      });
    }
    this.httpServerApi.on("request", app);

    // the address() method returns a string for unix domain sockets and null
    // if the server is not listening but we don't car about any of those cases
    // so the casting here should be safe. Famous last words... I know.
    const addressInfo = this.httpServerApi.address() as AddressInfo;
    this.log.info(`Cactus API net.AddressInfo`, addressInfo);

    const httpUrl = `http://${addressInfo.address}:${addressInfo.port}`;
    this.log.info(`Cactus API reachable ${httpUrl}`);

    return addressInfo;
  }

  createOpenApiValidator(): OpenApiValidator {
    return new OpenApiValidator({
      apiSpec: CACTUS_OPEN_API_JSON,
      validateRequests: true,
      validateResponses: false,
    });
  }

  createCorsMiddleware(): RequestHandler {
    const apiCorsDomainCsv = this.options.config.apiCorsDomainCsv;
    const allowedDomains = apiCorsDomainCsv.split(",");
    const allDomainsAllowed = allowedDomains.includes("*");

    const corsOptions: CorsOptions = {
      origin: (origin: string | undefined, callback) => {
        if (
          allDomainsAllowed ||
          (origin && allowedDomains.indexOf(origin) !== -1)
        ) {
          callback(null, true);
        } else {
          callback(new Error(`CORS not allowed for Origin "${origin}".`));
        }
      },
    };
    return cors(corsOptions);
  }
}
