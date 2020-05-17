import path from "path";
import { Server } from "http";
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
  config: ICactusApiServerConfig;
}

export class ApiServer {
  private readonly log: Logger;
  private pluginRegistry: PluginRegistry | undefined;
  private httpServerApi: Server | null = null;
  private httpServerCockpit: Server | null = null;

  constructor(public readonly options: IApiServerConstructorOptions) {
    if (!options) {
      throw new Error(`ApiServer#ctor options was falsy`);
    }
    if (!options.config) {
      throw new Error(`ApiServer#ctor options.config was falsy`);
    }

    this.log = LoggerProvider.getOrCreate({
      label: "api-server",
      level: options.config.logLevel,
    });
  }

  async start(): Promise<void> {
    try {
      await this.startCockpitFileServer();
      await this.startApiServer();
    } catch (ex) {
      this.log.error(`Failed to start ApiServer: ${ex.stack}`);
      this.log.error(`Attempting shutdown...`);
      await this.shutdown();
    }
  }

  public getHttpServerApi(): Server | null {
    return this.httpServerApi;
  }

  public getHttpServerCockpit(): Server | null {
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

  async startCockpitFileServer(): Promise<void> {
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

    await new Promise<any>((resolve, reject) => {
      this.httpServerCockpit = app.listen(cockpitPort, cockpitHost, () => {
        const httpUrl = `http://${cockpitHost}:${cockpitPort}`;
        this.log.info(`Cactus Cockpit UI reachable ${httpUrl}`);
        resolve({ cockpitPort });
      });
      this.httpServerCockpit.on("error", (err: any) => reject(err));
    });
  }

  async startApiServer(): Promise<void> {
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

    await Promise.all(webServicesInstalled);
    this.log.info(`Installed ${webServicesInstalled.length} web services OK`);

    const apiPort: number = this.options.config.apiPort;
    const apiHost: string = this.options.config.apiHost;
    this.log.info(`Binding Cactus API to port ${apiPort}...`);
    await new Promise<any>((resolve, reject) => {
      const httpServerApi = app.listen(apiPort, apiHost, () => {
        const address: any = httpServerApi.address();
        this.log.info(`Successfully bound API to port ${apiPort}`, { address });
        if (address && address.port) {
          resolve({ port: address.port });
        } else {
          resolve({ port: apiPort });
        }
      });
      this.httpServerApi = httpServerApi;
      this.httpServerApi.on("error", (err) => reject(err));
    });
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
