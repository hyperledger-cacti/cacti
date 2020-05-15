import path from "path";
import { Server } from "http";
import { Config } from "convict";
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
  IPluginKVStorage,
  PluginFactory,
  ICactusPlugin,
  PluginAspect,
  isIPluginWebService,
  IPluginWebService,
} from "@hyperledger-labs/bif-core-api";
import { IBifApiServerOptions } from "./config/config-service";
import { BIF_OPEN_API_JSON } from "./openapi-spec";
import { Logger, LoggerProvider } from "@hyperledger-labs/bif-common";
import { Servers } from "./common/servers";

export interface IApiServerConstructorOptions {
  plugins: ICactusPlugin[];
  config: Config<IBifApiServerOptions>;
}

export class ApiServer {
  private readonly log: Logger;
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
      level: options.config.get("logLevel"),
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

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down API server ...`);
    const webServicesShutdown = this.options.plugins
      .filter((pluginInstance) => isIPluginWebService(pluginInstance))
      .map((pluginInstance: ICactusPlugin) => {
        return (pluginInstance as IPluginWebService).shutdown();
      });

    this.log.info(
      `Found ${webServicesShutdown.length} web service plugin(s), shutting them down ...`
    );
    await Promise.all(webServicesShutdown);
    this.log.info(
      `Shut down ${webServicesShutdown.length} web service plugin(s) OK`
    );

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
    const cockpitWwwRoot = this.options.config.get("cockpitWwwRoot");
    this.log.info(`wwwRoot: ${cockpitWwwRoot}`);

    const resolvedWwwRoot = path.resolve(process.cwd(), cockpitWwwRoot);
    this.log.info(`resolvedWwwRoot: ${resolvedWwwRoot}`);

    const resolvedIndexHtml = path.resolve(resolvedWwwRoot + "/index.html");
    this.log.info(`resolvedIndexHtml: ${resolvedIndexHtml}`);

    const app: Express = express();
    app.use(compression());
    app.use(express.static(resolvedWwwRoot));
    app.get("/*", (_, res) => res.sendFile(resolvedIndexHtml));

    const cockpitPort: number = this.options.config.get("cockpitPort");
    const cockpitHost: string = this.options.config.get("cockpitHost");

    await new Promise<any>((resolve, reject) => {
      this.httpServerCockpit = app.listen(cockpitPort, cockpitHost, () => {
        this.log.info(
          `Cactus Cockpit UI reachable on port http://${cockpitHost}:${cockpitPort}`
        );
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

    this.log.info(`Starting to install web services...`);
    const webServicesInstalled = this.options.plugins
      .filter((pluginInstance) => isIPluginWebService(pluginInstance))
      .map((pluginInstance: ICactusPlugin) => {
        return (pluginInstance as IPluginWebService).installWebServices(app);
      });
    await Promise.all(webServicesInstalled);
    this.log.info(`Installed ${webServicesInstalled.length} web services OK`);

    const apiPort: number = this.options.config.get("apiPort");
    const apiHost: string = this.options.config.get("apiHost");
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
      apiSpec: BIF_OPEN_API_JSON,
      validateRequests: true,
      validateResponses: false,
    });
  }

  async createStoragePlugin(): Promise<IPluginKVStorage> {
    const kvStoragePlugin = this.options.plugins.find(
      (p) => p.getAspect() === PluginAspect.KV_STORAGE
    );
    if (kvStoragePlugin) {
      return kvStoragePlugin as IPluginKVStorage;
    }
    const storagePluginPackage = this.options.config.get(
      "storagePluginPackage"
    );
    const { PluginFactoryKVStorage } = await import(storagePluginPackage);
    const storagePluginOptionsJson = this.options.config.get(
      "storagePluginOptionsJson"
    );
    const storagePluginOptions = JSON.parse(storagePluginOptionsJson);
    const pluginFactory: PluginFactory<
      IPluginKVStorage,
      unknown
    > = new PluginFactoryKVStorage();
    const plugin = await pluginFactory.create(storagePluginOptions);
    return plugin;
  }

  createCorsMiddleware(): RequestHandler {
    const apiCorsDomainCsv = this.options.config.get("apiCorsDomainCsv");
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
