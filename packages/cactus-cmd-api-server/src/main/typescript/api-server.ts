import type { AddressInfo } from "net";
import type { Server as SecureServer } from "https";
import exitHook from "async-exit-hook";
import os from "os";
import path from "path";
import tls from "tls";
import { Server, createServer } from "http";
import { createServer as createSecureServer } from "https";
import { RuntimeError } from "run-time-error";
import { gte } from "semver";
import lmify from "lmify";
import fs from "fs-extra";
import expressHttpProxy from "express-http-proxy";
import { Server as GrpcServer } from "@grpc/grpc-js";
import { ServerCredentials as GrpcServerCredentials } from "@grpc/grpc-js";
import type { Application, Request, Response, RequestHandler } from "express";
import express from "express";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import compression from "compression";
import bodyParser from "body-parser";
import cors from "cors";

import { Server as SocketIoServer } from "socket.io";
import type { ServerOptions as SocketIoServerOptions } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import { authorize as authorizeSocket } from "@thream/socketio-jwt";

import {
  ICactusPlugin,
  isIPluginWebService,
  IPluginWebService,
  IPluginFactoryOptions,
  PluginFactoryFactory,
  PluginImport,
  Constants,
  PluginImportAction,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";

import {
  Bools,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";

import { ICactusApiServerOptions } from "./config/config-service";
import OAS from "../json/openapi.json";
// import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { AuthorizerFactory } from "./authzn/authorizer-factory";
import { WatchHealthcheckV1 } from "./generated/openapi/typescript-axios";
import { WatchHealthcheckV1Endpoint } from "./web-services/watch-healthcheck-v1-endpoint";
import * as default_service from "./generated/proto/protoc-gen-ts/services/default_service";
import { GrpcServerApiServer } from "./web-services/grpc/grpc-server-api-server";
import { determineAddressFamily } from "./common/determine-address-family";

export interface IApiServerConstructorOptions {
  readonly pluginManagerOptions?: { pluginsPath: string };
  readonly pluginRegistry?: PluginRegistry;
  readonly httpServerApi?: Server | SecureServer;
  readonly wsServerApi?: SocketIoServer;
  readonly grpcServer?: GrpcServer;
  readonly wsOptions?: SocketIoServerOptions;
  readonly httpServerCockpit?: Server | SecureServer;
  readonly config: ICactusApiServerOptions;
  readonly prometheusExporter?: PrometheusExporter;
  readonly enableShutdownHook?: boolean;
}

export class ApiServer {
  public static readonly CLASS_NAME = "ApiServer";
  public static readonly E_POST_CRASH_SHUTDOWN =
    "API server failed to shut itself down, will ignore this because we were already crashing anyway...";
  public static readonly E_NON_EXEMPT_UNPROTECTED_ENDPOINTS =
    `Non-exempt unprotected endpoints found. ` +
    `You can allow them as unprotected via the configuration of the ` +
    `API server by specifying an array of patterns in the property ` +
    `"unprotectedEndpointExemptions" of "authorizationConfigJson". ` +
    `This mechanism is meant to foster DevOps where both dev & ops ` +
    `work together in making secure application deployments a reality. ` +
    `The comma separated list of unprotected endpoints that were not marked as exempt: `;

  private readonly log: Logger;
  private pluginRegistry: PluginRegistry | undefined;
  private readonly httpServerApi: Server | SecureServer;
  private readonly httpServerCockpit?: Server | SecureServer;
  private readonly wsApi: SocketIoServer;
  private readonly grpcServer: GrpcServer;
  private readonly expressApi: Application;
  private readonly expressCockpit: Application;
  private readonly pluginsPath: string;
  private readonly enableShutdownHook: boolean;

  public prometheusExporter: PrometheusExporter;

  public get className(): string {
    return ApiServer.CLASS_NAME;
  }

  constructor(public readonly options: IApiServerConstructorOptions) {
    if (!options) {
      throw new Error(`ApiServer#ctor options was falsy`);
    }
    if (!options.config) {
      throw new Error(`ApiServer#ctor options.config was falsy`);
    }

    this.enableShutdownHook = Bools.isBooleanStrict(
      options.config.enableShutdownHook,
    )
      ? (options.config.enableShutdownHook as boolean)
      : true;

    if (this.enableShutdownHook) {
      exitHook(() => this.shutdown());
    }

    LoggerProvider.setLogLevel(options.config.logLevel);

    if (this.options.httpServerApi) {
      this.httpServerApi = this.options.httpServerApi;
    } else if (this.options.config.apiTlsEnabled) {
      this.httpServerApi = createSecureServer({
        key: this.options.config.apiTlsKeyPem,
        cert: this.options.config.apiTlsCertPem,
      });
    } else {
      this.httpServerApi = createServer();
    }

    if (this.options.config.cockpitEnabled) {
      if (this.options.httpServerCockpit) {
        this.httpServerCockpit = this.options.httpServerCockpit;
      } else if (this.options.config.cockpitTlsEnabled) {
        this.httpServerCockpit = createSecureServer({
          key: this.options.config.cockpitTlsKeyPem,
          cert: this.options.config.cockpitTlsCertPem,
        });
      } else {
        this.httpServerCockpit = createServer();
      }
    }

    this.grpcServer = this.options.grpcServer || new GrpcServer({});
    this.wsApi = new SocketIoServer();
    this.expressApi = express();
    this.expressCockpit = express();

    if (this.options.prometheusExporter) {
      this.prometheusExporter = this.options.prometheusExporter;
    } else {
      this.prometheusExporter = new PrometheusExporter({
        pollingIntervalInMin: 1,
      });
    }
    this.prometheusExporter.startMetricsCollection();
    this.prometheusExporter.setTotalPluginImports(this.getPluginImportsCount());

    this.log = LoggerProvider.getOrCreate({
      label: "api-server",
      level: options.config.logLevel,
    });

    const defaultPluginsPath = path.join(
      os.tmpdir(),
      "org",
      "hyperledger",
      "cactus",
      "plugins",
    );

    const { pluginsPath } = {
      ...{ pluginsPath: defaultPluginsPath },
      ...JSON.parse(this.options.config.pluginManagerOptionsJson),
      ...this.options.pluginManagerOptions,
    } as { pluginsPath: string };

    this.pluginsPath = pluginsPath;
    this.log.debug("pluginsPath: %o", pluginsPath);
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    this.prometheusExporter.setTotalPluginImports(this.getPluginImportsCount());
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getPluginImportsCount(): number {
    return this.pluginRegistry?.plugins.length || 0;
  }

  async start(): Promise<{
    addressInfoCockpit?: AddressInfo;
    addressInfoApi: AddressInfo;
    addressInfoGrpc: AddressInfo;
  }> {
    this.checkNodeVersion();
    const tlsMaxVersion = this.options.config.tlsDefaultMaxVersion;
    this.log.info("Setting tls.DEFAULT_MAX_VERSION to %s...", tlsMaxVersion);
    tls.DEFAULT_MAX_VERSION = tlsMaxVersion;

    try {
      const { cockpitTlsEnabled, apiTlsEnabled } = this.options.config;
      let addressInfoCockpit: AddressInfo | undefined;
      if (this.options.config.cockpitEnabled) {
        addressInfoCockpit = await this.startCockpitFileServer();
      }
      const addressInfoApi = await this.startApiServer();
      const addressInfoGrpc = await this.startGrpcServer();

      {
        const { port, address } = addressInfoGrpc;
        const grpcUrl = `${address}:${port}`;
        this.log.info(`Cactus gRPC reachable ${grpcUrl}`);
      }

      {
        const { apiHost: host } = this.options.config;
        const { port } = addressInfoApi;
        const protocol = apiTlsEnabled ? "https:" : "http:";
        const httpUrl = `${protocol}//${host}:${port}`;
        this.log.info(`Cactus API reachable ${httpUrl}`);
      }

      if (this.options.config.cockpitEnabled) {
        const { cockpitHost: host } = this.options.config;
        const { port } = addressInfoCockpit as AddressInfo;
        const protocol = cockpitTlsEnabled ? "https:" : "http:";
        const httpUrl = `${protocol}//${host}:${port}`;
        this.log.info(`Cactus Cockpit reachable ${httpUrl}`);
      }

      return { addressInfoCockpit, addressInfoApi, addressInfoGrpc };
    } catch (ex) {
      const errorMessage = `Failed to start ApiServer: ${ex.stack}`;
      this.log.error(errorMessage);
      this.log.error(`Attempting shutdown...`);
      try {
        await this.shutdown();
        this.log.info(`Server shut down after crash OK`);
      } catch (ex) {
        this.log.error(ApiServer.E_POST_CRASH_SHUTDOWN, ex);
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Verifies that the currently running NodeJS process is at least of a certain
   * NodeJS version as specified by the configuration.
   *
   * @throws {Error} if the version contraint is not satisfied by the runtime.
   */
  public checkNodeVersion(currentVersion: string = process.version): void {
    if (gte(this.options.config.minNodeVersion, currentVersion)) {
      const msg =
        `ApiServer#checkNodeVersion() detected NodeJS ` +
        `v${process.version} that is outdated as per the configuration. ` +
        `If you must run on this NodeJS version you can override the minimum ` +
        `acceptable version via config parameters of the API server. ` +
        `Though doing so may lead to vulnerabilities in your deployment. ` +
        `You've been warned.`;
      throw new Error(msg);
    }
  }

  public getHttpServerApi(): Server | SecureServer {
    return this.httpServerApi;
  }

  public getHttpServerCockpit(): Server | SecureServer | undefined {
    return this.httpServerCockpit;
  }

  public async getOrInitPluginRegistry(): Promise<PluginRegistry> {
    try {
      if (!this.pluginRegistry) {
        if (!this.options.pluginRegistry) {
          this.log.info(`getOrInitPluginRegistry() initializing a new one...`);
          this.pluginRegistry = await this.initPluginRegistry();
        } else {
          this.log.info(`getOrInitPluginRegistry() re-using injected one...`);
          this.pluginRegistry = this.options.pluginRegistry;
        }
      }
      await this.prometheusExporter.setTotalPluginImports(
        await this.getPluginImportsCount(),
      );
      return this.pluginRegistry;
    } catch (e) {
      this.pluginRegistry = new PluginRegistry({ plugins: [] });
      const errorMessage = `Failed init PluginRegistry: ${e.stack}`;
      this.log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async initPluginRegistry(): Promise<PluginRegistry> {
    const registry = new PluginRegistry({ plugins: [] });
    const { plugins } = this.options.config;
    this.log.info(`Instantiated empty registry, invoking plugin factories...`);

    for (const pluginImport of plugins) {
      const plugin = await this.instantiatePlugin(pluginImport, registry);
      registry.add(plugin);
    }

    return registry;
  }

  private async instantiatePlugin(
    pluginImport: PluginImport,
    registry: PluginRegistry,
  ): Promise<ICactusPlugin> {
    const fnTag = `${this.className}#instantiatePlugin`;
    const { logLevel } = this.options.config;
    const { packageName, options } = pluginImport;
    this.log.info(`Creating plugin from package: ${packageName}`, options);
    const pluginOptions = { ...options, logLevel, pluginRegistry: registry };

    try {
      if (pluginImport.action == PluginImportAction.Install) {
        await this.installPluginPackage(pluginImport);
      } else {
        this.log.info(
          `The installation of the plugin package ${packageName} was skipped due to the configuration flag action`,
        );
      }

      const packagePath = path.join(
        this.pluginsPath,
        options.instanceId,
        "node_modules",
        packageName,
      );
      this.log.debug("Package path: %o", packagePath);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pluginPackage = require(/* webpackIgnore: true */ packagePath);
      const createPluginFactory = pluginPackage.createPluginFactory as PluginFactoryFactory;
      const pluginFactoryOptions: IPluginFactoryOptions = {
        pluginImportType: pluginImport.type,
      };
      const pluginFactory = await createPluginFactory(pluginFactoryOptions);
      const plugin = await pluginFactory.create(pluginOptions);

      // need to invoke the i-cactus-plugin onPluginInit functionality here before plugin registry can be used further
      await plugin.onPluginInit();

      return plugin;
    } catch (error) {
      const errorMessage = `${fnTag} failed instantiating plugin '${packageName}' with the instanceId '${options.instanceId}'`;
      this.log.error(errorMessage, error);

      if (error instanceof Error) {
        throw new RuntimeError(errorMessage, error);
      } else {
        throw new RuntimeError(errorMessage, JSON.stringify(error));
      }
    }
  }

  private async installPluginPackage(
    pluginImport: PluginImport,
  ): Promise<void> {
    const fnTag = `ApiServer#installPluginPackage()`;
    const pkgName = pluginImport.options.packageSrc
      ? pluginImport.options.packageSrc
      : pluginImport.packageName;

    const instanceId = pluginImport.options.instanceId;
    const pluginPackageDir = path.join(this.pluginsPath, instanceId);
    // version of the npm package
    const pluginVersion = pluginImport.options.version
      ? "@".concat(pluginImport.options.version)
      : "";
    try {
      await fs.mkdirp(pluginPackageDir);
      this.log.debug(`${pkgName} plugin package dir: %o`, pluginPackageDir);
    } catch (ex) {
      const errorMessage =
        "Could not create plugin installation directory, check the file-system permissions.";
      throw new RuntimeError(errorMessage, ex);
    }
    try {
      lmify.setPackageManager("npm");
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      lmify.setRootDir(pluginPackageDir);
      this.log.debug(`Installing ${pkgName} for plugin import`, pluginImport);
      const out = await lmify.install([
        pkgName.concat(pluginVersion), // empty if no version was specified
        "--production",
        "--audit=false",
        "--progress=false",
        "--fund=false",
        `--prefix=${pluginPackageDir}`,
        // "--ignore-workspace-root-check",
      ]);
      this.log.debug("%o install result: %o", pkgName, out);
      if (out.exitCode !== 0) {
        throw new RuntimeError("Non-zero exit code: ", JSON.stringify(out));
      }
      this.log.info(`Installed ${pkgName} OK`);
    } catch (ex) {
      const errorMessage = `${fnTag} failed installing plugin '${pkgName}`;
      this.log.error(errorMessage, ex);

      if (ex instanceof Error) {
        throw new RuntimeError(errorMessage, ex);
      } else {
        throw new RuntimeError(errorMessage, JSON.stringify(ex));
      }
    }
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

    if (this.httpServerApi?.listening) {
      this.log.info(`Closing HTTP server of the API...`);
      await Servers.shutdown(this.httpServerApi);
      this.log.info(`Close HTTP server of the API OK`);
    }

    if (this.httpServerCockpit?.listening) {
      this.log.info(`Closing HTTP server of the cockpit ...`);
      await Servers.shutdown(this.httpServerCockpit);
      this.log.info(`Close HTTP server of the cockpit OK`);
    }

    if (this.grpcServer) {
      this.log.info(`Closing gRPC server ...`);
      await new Promise<void>((resolve, reject) => {
        this.grpcServer.tryShutdown((ex?: Error) => {
          if (ex) {
            this.log.error("Failed to shut down gRPC server: ", ex);
            reject(ex);
          } else {
            resolve();
          }
        });
      });
      this.log.info(`Close gRPC server OK`);
    }
  }

  async startCockpitFileServer(): Promise<AddressInfo> {
    const { expressCockpit: app } = this;
    const cockpitWwwRoot = this.options.config.cockpitWwwRoot;
    this.log.info(`wwwRoot: ${cockpitWwwRoot}`);

    const resolvedWwwRoot = path.resolve(process.cwd(), cockpitWwwRoot);
    this.log.info(`resolvedWwwRoot: ${resolvedWwwRoot}`);

    const resolvedIndexHtml = path.resolve(resolvedWwwRoot + "/index.html");
    this.log.info(`resolvedIndexHtml: ${resolvedIndexHtml}`);

    const cockpitCorsDomainCsv = this.options.config.cockpitCorsDomainCsv;
    const allowedDomains = cockpitCorsDomainCsv.split(",");
    const corsMiddleware = this.createCorsMiddleware(allowedDomains);

    const {
      apiHost,
      apiPort,
      cockpitApiProxyRejectUnauthorized: rejectUnauthorized,
    } = this.options.config;
    const protocol = this.options.config.apiTlsEnabled ? "https:" : "http:";
    const apiHttpUrl = `${protocol}//${apiHost}:${apiPort}`;

    const apiProxyMiddleware = expressHttpProxy(apiHttpUrl, {
      // preserve the path whatever it was. Without this the proxy just uses /
      proxyReqPathResolver: (srcReq) => srcReq.originalUrl,

      proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        const { originalUrl: thePath } = srcReq;
        const srcHost = srcReq.header("host");
        const { host: destHostname, port: destPort } = proxyReqOpts;
        const destHost = `${destHostname}:${destPort}`;
        this.log.debug(`PROXY ${srcHost} => ${destHost} :: ${thePath}`);

        // make sure self signed certs are accepted if it was configured as such by the user
        (proxyReqOpts as any).rejectUnauthorized = rejectUnauthorized;
        return proxyReqOpts;
      },
    });

    app.use("/api/v*", apiProxyMiddleware);
    app.use(compression());
    app.use(corsMiddleware);
    app.use(express.static(resolvedWwwRoot));
    app.get("/*", (_, res) => res.sendFile(resolvedIndexHtml));

    const cockpitPort: number = this.options.config.cockpitPort;
    const cockpitHost: string = this.options.config.cockpitHost;

    if (!this.httpServerCockpit?.listening) {
      await new Promise((resolve, reject) => {
        this.httpServerCockpit?.once("error", reject);
        this.httpServerCockpit?.once("listening", resolve);
        this.httpServerCockpit?.listen(cockpitPort, cockpitHost);
      });
    }
    this.httpServerCockpit?.on("request", app);

    // the address() method returns a string for unix domain sockets and null
    // if the server is not listening but we don't car about any of those cases
    // so the casting here should be safe. Famous last words... I know.
    const addressInfo = this.httpServerCockpit?.address() as AddressInfo;
    this.log.info(`Cactus Cockpit net.AddressInfo`, addressInfo);

    return addressInfo;
  }

  /**
   * Installs the own endpoints of the API server such as the ones providing
   * healthcheck and monitoring information.
   * @param app
   */
  async getOrCreateWebServices(app: express.Application): Promise<void> {
    const { log } = this;
    const { logLevel } = this.options.config;

    const healthcheckHandler = (req: Request, res: Response) => {
      res.json({
        success: true,
        createdAt: new Date(),
        memoryUsage: process.memoryUsage(),
      });
    };

    const { "/api/v1/api-server/healthcheck": oasPath } = OAS.paths;
    const { http } = oasPath.get["x-hyperledger-cactus"];
    const { path: httpPath, verbLowerCase: httpVerb } = http;
    (app as any)[httpVerb](httpPath, healthcheckHandler);

    this.wsApi.on("connection", (socket: SocketIoSocket) => {
      const { id } = socket;
      const transport = socket.conn.transport.name; // in most cases, "polling"
      log.debug(`Socket connected. ID=${id} transport=%o`, transport);

      socket.conn.on("upgrade", () => {
        const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
        log.debug(`Socket upgraded ID=${id} transport=%o`, upgradedTransport);
      });

      socket.on(WatchHealthcheckV1.Subscribe, () =>
        new WatchHealthcheckV1Endpoint({
          process,
          socket,
          logLevel,
        }).subscribe(),
      );
    });

    const prometheusExporterHandler = (req: Request, res: Response) => {
      this.getPrometheusExporterMetrics().then((resBody) => {
        res.status(200);
        res.send(resBody);
      });
    };

    const {
      "/api/v1/api-server/get-prometheus-exporter-metrics": oasPathPrometheus,
    } = OAS.paths;
    const { http: httpPrometheus } = oasPathPrometheus.get[
      "x-hyperledger-cactus"
    ];
    const {
      path: httpPathPrometheus,
      verbLowerCase: httpVerbPrometheus,
    } = httpPrometheus;
    (app as any)[httpVerbPrometheus](
      httpPathPrometheus,
      prometheusExporterHandler,
    );
  }

  async startGrpcServer(): Promise<AddressInfo> {
    return new Promise((resolve, reject) => {
      // const grpcHost = "0.0.0.0"; // FIXME - make this configurable (config-service.ts)
      const grpcHost = "127.0.0.1"; // FIXME - make this configurable (config-service.ts)
      const grpcHostAndPort = `${grpcHost}:${this.options.config.grpcPort}`;

      const grpcTlsCredentials = this.options.config.grpcMtlsEnabled
        ? GrpcServerCredentials.createSsl(
            Buffer.from(this.options.config.apiTlsCertPem),
            [
              {
                cert_chain: Buffer.from(this.options.config.apiTlsCertPem),
                private_key: Buffer.from(this.options.config.apiTlsKeyPem),
              },
            ],
            true,
          )
        : GrpcServerCredentials.createInsecure();

      this.grpcServer.bindAsync(
        grpcHostAndPort,
        grpcTlsCredentials,
        (error: Error | null, port: number) => {
          if (error) {
            this.log.error("Binding gRPC failed: ", error);
            return reject(new RuntimeError("Binding gRPC failed: ", error));
          }
          this.grpcServer.addService(
            default_service.org.hyperledger.cactus.cmd_api_server
              .UnimplementedDefaultServiceService.definition,
            new GrpcServerApiServer(),
          );
          this.grpcServer.start();
          const family = determineAddressFamily(grpcHost);
          resolve({ address: grpcHost, port, family });
        },
      );
    });
  }

  async startApiServer(): Promise<AddressInfo> {
    const { options, expressApi: app, wsApi } = this;
    const { config } = options;
    const {
      authorizationConfigJson: authzConf,
      authorizationProtocol: authzProtocol,
      logLevel,
    } = config;
    const apiServerOptions = config;

    const pluginRegistry = await this.getOrInitPluginRegistry();

    app.use(compression());

    const apiCorsDomainCsv = this.options.config.apiCorsDomainCsv;
    const allowedDomains = apiCorsDomainCsv.split(",");
    const corsMiddleware = this.createCorsMiddleware(allowedDomains);
    app.use(corsMiddleware);
    app.use(bodyParser.json({ limit: "50mb" }));

    const authzFactoryOptions = { apiServerOptions, pluginRegistry, logLevel };
    const authzFactory = new AuthorizerFactory(authzFactoryOptions);
    await authzFactory.initOnce();
    const authorizerO = await authzFactory.createMiddleware(
      authzProtocol,
      authzConf,
    );
    if (authorizerO.isPresent()) {
      const authorizer = authorizerO.get();
      this.checkNonExemptUnprotectedEps(authzFactory);
      app.use(authorizer);
      this.log.info(`Authorization request handler configured OK.`);
    }

    this.getOrCreateWebServices(app); // The API server's own endpoints

    this.log.info(`Starting to install web services...`);

    const webServicesInstalled = pluginRegistry
      .getPlugins()
      .filter((pluginInstance) => isIPluginWebService(pluginInstance))
      .map(async (plugin: ICactusPlugin) => {
        const p = plugin as IPluginWebService;
        await p.getOrCreateWebServices();
        const apiSpec = p.getOpenApiSpec() as OpenAPIV3.Document;
        if (apiSpec)
          await installOpenapiValidationMiddleware({ app, apiSpec, logLevel });
        const webSvcs = await p.registerWebServices(app, wsApi);
        return webSvcs;
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
    // if the server is not listening but we don't care about any of those cases
    // so the casting here should be safe. Famous last words... I know.
    const addressInfo = this.httpServerApi.address() as AddressInfo;
    this.log.info(`Cactus API net.AddressInfo`, addressInfo);

    const wsOptions = {
      path: Constants.SocketIoConnectionPathV1,
      serveClient: false,
      ...this.options.wsOptions,
    } as SocketIoServerOptions;

    this.wsApi.attach(this.httpServerApi, wsOptions);

    const socketIoAuthorizer = authorizeSocket({
      ...authzConf.socketIoJwtOptions,
      onAuthentication: (decodedToken) => {
        this.log.debug("Socket authorized OK: %o", decodedToken);
      },
    });

    this.wsApi.use(socketIoAuthorizer as never);

    return addressInfo;
  }

  private checkNonExemptUnprotectedEps(factory: AuthorizerFactory): void {
    const { config } = this.options;
    const { authorizationConfigJson } = config;
    const { unprotectedEndpointExemptions } = authorizationConfigJson;

    const nonExempts = factory.unprotectedEndpoints.filter(
      (nse) =>
        !unprotectedEndpointExemptions.some((pt) => nse.getPath().match(pt)),
    );
    if (nonExempts.length > 0) {
      const csv = nonExempts.join(", ");
      const { E_NON_EXEMPT_UNPROTECTED_ENDPOINTS } = ApiServer;
      throw new Error(`${E_NON_EXEMPT_UNPROTECTED_ENDPOINTS} ${csv}`);
    }
  }

  createCorsMiddleware(allowedDomains: string[]): RequestHandler {
    const allDomainsOk = allowedDomains.includes("*");

    const corsOptionsDelegate = (req: Request, callback: any) => {
      const origin = req.header("Origin");
      const isDomainOk = origin && allowedDomains.includes(origin);
      // this.log.debug("CORS %j %j %s", allDomainsOk, isDomainOk, req.originalUrl);

      let corsOptions;
      if (allDomainsOk) {
        corsOptions = { origin: "*" }; // reflect (enable) the all origins in the CORS response
      } else if (isDomainOk) {
        corsOptions = { origin }; // reflect (enable) the requested origin in the CORS response
      } else {
        corsOptions = { origin: false }; // disable CORS for this request
      }
      callback(null, corsOptions); // callback expects two parameters: error and options
    };
    return cors(corsOptionsDelegate);
  }
}
