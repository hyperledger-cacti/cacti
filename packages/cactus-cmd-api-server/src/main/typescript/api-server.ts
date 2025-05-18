import type { AddressInfo } from "net";
import { Http2Server, Http2ServerRequest } from "node:http2";
import { Http2ServerResponse } from "node:http2";
import type { Server as SecureServer } from "https";
import type { Request, Response, RequestHandler } from "express";
import type { ServerOptions as SocketIoServerOptions } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";
import os from "os";
import path from "path";
import tls from "tls";
import { Server, createServer } from "http";
import { createServer as createSecureServer } from "https";
import { RuntimeError } from "run-time-error-cjs";
import { gte } from "semver";
import lmify from "lmify";
import fs from "fs-extra";
import expressHttpProxy from "express-http-proxy";
import { Server as GrpcServer } from "@grpc/grpc-js";
import { ServerCredentials as GrpcServerCredentials } from "@grpc/grpc-js";
import { expressConnectMiddleware } from "@connectrpc/connect-express";
import { ConnectRouter } from "@connectrpc/connect";
import {
  fastify,
  FastifyBaseLogger,
  FastifyInstance,
  FastifyTypeProviderDefault,
} from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";
import express from "express";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import compression from "compression";
import bodyParser from "body-parser";
import cors, { CorsOptionsDelegate, CorsRequest } from "cors";

import { Server as SocketIoServer } from "socket.io";
import { authorize as authorizeSocket } from "@thream/socketio-jwt";
import { ServiceType } from "@bufbuild/protobuf";

import {
  ICactusPlugin,
  isIPluginWebService,
  IPluginWebService,
  IPluginFactoryOptions,
  PluginFactoryFactory,
  PluginImport,
  Constants,
  PluginImportAction,
  isIPluginGrpcService,
  isIPluginCrpcService,
  ICrpcSvcRegistration,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";

import {
  Bools,
  isExpressHttpVerbMethodName,
  Logger,
  LoggerProvider,
  newRex,
  Servers,
} from "@hyperledger/cactus-common";

import { ICactusApiServerOptions } from "./config/config-service";
import OAS from "../json/openapi.json";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { AuthorizerFactory } from "./authzn/authorizer-factory";
import { WatchHealthcheckV1 } from "./generated/openapi/typescript-axios";
import { WatchHealthcheckV1Endpoint } from "./web-services/watch-healthcheck-v1-endpoint";
import * as default_service from "./generated/proto/protoc-gen-ts/services/default_service";
import { GrpcServerApiServer } from "./web-services/grpc/grpc-server-api-server";
import { determineAddressFamily } from "./common/determine-address-family";
import {
  GetOpenApiSpecV1Endpoint,
  IGetOpenApiSpecV1EndpointOptions,
} from "./web-services/get-open-api-spec-v1-endpoint";
import {
  GetHealthcheckV1Endpoint,
  IGetHealthcheckV1EndpointOptions,
} from "./web-services/get-healthcheck-v1-endpoint";

export interface IApiServerConstructorOptions {
  readonly pluginManagerOptions?: { pluginsPath: string };
  readonly pluginRegistry?: PluginRegistry;
  readonly httpServerApi?: Server | SecureServer;
  readonly wsServerApi?: SocketIoServer;
  readonly grpcServer?: GrpcServer;
  readonly crpcServer?: FastifyInstance<
    Http2Server,
    Http2ServerRequest,
    Http2ServerResponse,
    FastifyBaseLogger,
    FastifyTypeProviderDefault
  >;
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
  private readonly crpcServer: FastifyInstance<
    Http2Server,
    Http2ServerRequest,
    Http2ServerResponse,
    FastifyBaseLogger,
    FastifyTypeProviderDefault
  >;
  private readonly expressApi: express.Express;
  private readonly expressCockpit: express.Express;
  private readonly pluginsPath: string;
  private readonly enableShutdownHook: boolean;

  public prometheusExporter: PrometheusExporter;
  public boundGrpcHostPort: string;

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

    this.boundGrpcHostPort = "127.0.0.1:-1";

    this.enableShutdownHook = Bools.isBooleanStrict(
      options.config.enableShutdownHook,
    )
      ? (options.config.enableShutdownHook as boolean)
      : true;

    if (this.enableShutdownHook) {
      exitHook(() => this.shutdown());
    }

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

    this.crpcServer =
      this.options.crpcServer ||
      fastify({ http2: true, forceCloseConnections: true });

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

    if (this.enableShutdownHook) {
      exitHook((onHookDone: IAsyncExitHookDoneCallback) => {
        this.log.info("Starting async-exit-hook for cmd-api-server ...");
        this.shutdown()
          .catch((ex: unknown) => {
            this.log.warn("Failed async-exit-hook for cmd-api-server", ex);
            throw ex;
          })
          .finally(() => {
            this.log.info("Concluded async-exit-hook for cmd-api-server ...");
            onHookDone();
          });
        this.log.info("Started async-exit-hook for cmd-api-server OK");
      });
      this.log.info("Registered async-exit-hook for cmd-api-server shutdown.");
    }

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
    readonly addressInfoCockpit?: AddressInfo;
    readonly addressInfoApi: AddressInfo;
    readonly addressInfoGrpc: AddressInfo;
    readonly addressInfoCrpc: AddressInfo;
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
      const { addressInfoCrpc, crpcUrl } = await this.startCrpcServer();
      this.log.debug("Cacti CRPC reachable %s", crpcUrl);

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

      return {
        addressInfoCockpit,
        addressInfoApi,
        addressInfoGrpc,
        addressInfoCrpc,
      };
    } catch (ex1: unknown) {
      const context = "Failed to start ApiServer";
      this.log.error(context, ex1);
      this.log.error(`Attempting shutdown...`);
      try {
        await this.shutdown();
        this.log.info(`Server shut down after crash OK`);
      } catch (ex2: unknown) {
        this.log.error(ApiServer.E_POST_CRASH_SHUTDOWN, ex2);
      }
      throw newRex(context, ex1);
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
    } catch (ex: unknown) {
      this.pluginRegistry = new PluginRegistry({ plugins: [] });
      const context = "Failed to init PluginRegistry";
      this.log.debug(context, ex);
      throw newRex(context, ex);
    }
  }

  public async initPluginRegistry(req?: {
    readonly pluginRegistry: PluginRegistry;
  }): Promise<PluginRegistry> {
    const { pluginRegistry = new PluginRegistry({ plugins: [] }) } = req || {};
    const { plugins } = this.options.config;
    this.log.info(`Instantiated empty registry, invoking plugin factories...`);

    for (const pluginImport of plugins) {
      const plugin = await this.instantiatePlugin(pluginImport, pluginRegistry);
      pluginRegistry.add(plugin);
    }

    return pluginRegistry;
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
      const createPluginFactory =
        pluginPackage.createPluginFactory as PluginFactoryFactory;
      const pluginFactoryOptions: IPluginFactoryOptions = {
        pluginImportType: pluginImport.type,
      };
      const pluginFactory = await createPluginFactory(pluginFactoryOptions);
      const plugin = await pluginFactory.create(pluginOptions);

      // need to invoke the i-cactus-plugin onPluginInit functionality here before plugin registry can be used further
      await plugin.onPluginInit();

      return plugin;
    } catch (ex: unknown) {
      const context = `${fnTag} failed instantiating plugin '${packageName}' with the instanceId '${options.instanceId}'`;
      this.log.debug(context, ex);
      throw newRex(context, ex);
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
    } catch (ex: unknown) {
      const context =
        "Could not create plugin installation directory, check the file-system permissions.";
      throw newRex(context, ex);
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
      if (out?.exitCode && out.exitCode !== 0) {
        const eMsg =
          "Non-zero exit code returned by lmify.install() indicating that the underlying npm install OS process had encountered a problem:";
        throw newRex(eMsg, out);
      }
      this.log.info(`Installed ${pkgName} OK`);
    } catch (ex: unknown) {
      const context = `${fnTag} failed installing plugin '${pkgName}`;
      this.log.debug(ex, context);
      throw newRex(context, ex);
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

    if (this.wsApi) {
      this.log.info(`Disconnecting SocketIO connections...`);
      this.wsApi.disconnectSockets(true);
      this.log.info(`SocketIO connections disconnect OK`);
    }

    this.log.info(`Stopping ${webServicesShutdown.length} WS plugin(s)...`);
    await Promise.all(webServicesShutdown);
    this.log.info(`Stopped ${webServicesShutdown.length} WS plugin(s) OK`);

    if (this.httpServerApi?.listening) {
      this.log.info(`Closing Cacti HTTP server of the API...`);
      await Servers.shutdown(this.httpServerApi);
      this.log.info(`Close HTTP server of the API OK`);
    }

    if (this.httpServerCockpit?.listening) {
      this.log.info(`Closing Cacti HTTP server of the cockpit ...`);
      await Servers.shutdown(this.httpServerCockpit);
      this.log.info(`Close HTTP server of the cockpit OK`);
    }

    if (this.crpcServer) {
      const fastifyPlugins = this.crpcServer.printPlugins();
      this.log.info("Fastify plugin list: %o", fastifyPlugins);
      this.log.info(`Closing Cacti CRPC HTTP server ...`);
      await this.crpcServer.close();
      this.log.info(`Closed Cacti CRPC HTTP server OK`);
    }

    if (this.grpcServer) {
      await new Promise<void>((resolve, reject) => {
        this.log.info(`Draining Cacti gRPC server ...`);
        this.grpcServer.drain(this.boundGrpcHostPort, 5000);
        this.log.info(`Drained Cacti gRPC server OK`);

        this.log.info(`Trying to shut down Cacti gRPC server ...`);
        this.grpcServer.tryShutdown((ex?: Error) => {
          if (ex) {
            const eMsg =
              "Failed to shut down gRPC server of the Cacti API server.";
            this.log.debug(eMsg, ex);
            reject(newRex(eMsg, ex));
          } else {
            this.log.info(`Shut down Cacti gRPC server OK`);
            resolve();
          }
        });
      });
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
        (proxyReqOpts as Record<string, unknown>).rejectUnauthorized =
          rejectUnauthorized;
        return proxyReqOpts;
      },
    });

    const { rateLimit } = await import("express-rate-limit");
    const rateLimiterIndexHtml = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    const middlewareIndexHtml: RequestHandler = (_, res) =>
      res.sendFile(resolvedIndexHtml);

    app.use("/api/v*", apiProxyMiddleware as RequestHandler);
    app.use(compression() as RequestHandler);
    app.use(corsMiddleware);
    app.use(express.static(resolvedWwwRoot));
    app.get("/*", rateLimiterIndexHtml, middlewareIndexHtml);

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
    // if the server is not listening but we don't care about any of those cases
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
  async getOrCreateWebServices(app: express.Express): Promise<void> {
    const fnTag = `${this.className}#getOrCreateWebServices()}`;
    const { log } = this;
    const { logLevel } = this.options.config;
    const pluginRegistry = await this.getOrInitPluginRegistry();

    {
      const opts: IGetHealthcheckV1EndpointOptions = {
        process: global.process,
        logLevel,
      };
      const endpoint = new GetHealthcheckV1Endpoint(opts);
      await registerWebServiceEndpoint(app, endpoint);
    }

    {
      const oasPath = OAS.paths["/api/v1/api-server/get-open-api-spec"];

      const operationId = oasPath.get.operationId;
      const opts: IGetOpenApiSpecV1EndpointOptions = {
        oas: OAS,
        oasPath,
        operationId,
        path: oasPath.get["x-hyperledger-cacti"].http.path,
        pluginRegistry,
        verbLowerCase: oasPath.get["x-hyperledger-cacti"].http.verbLowerCase,
        logLevel,
      };
      const endpoint = new GetOpenApiSpecV1Endpoint(opts);
      await registerWebServiceEndpoint(app, endpoint);
    }

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

    const { http: httpPrometheus } =
      oasPathPrometheus.get["x-hyperledger-cacti"];

    const { path: httpPathPrometheus, verbLowerCase: httpVerbPrometheus } =
      httpPrometheus;

    if (!isExpressHttpVerbMethodName(httpVerbPrometheus)) {
      const eMsg = `${fnTag} Invalid HTTP verb "${httpVerbPrometheus}" in cmd-api-server OpenAPI specification for HTTP path: "${httpPathPrometheus}"`;
      throw new RuntimeError(eMsg);
    }

    app[httpVerbPrometheus](httpPathPrometheus, prometheusExporterHandler);
  }

  async createCrpcExpressMiddlewareHandler(): Promise<{
    readonly svcCount: number;
    readonly crpcMiddlewareHandler: express.RequestHandler;
  }> {
    const { crpcRoutesHandler, svcCount } =
      await this.createCrpcRoutesHandler();

    const crpcMiddlewareHandler = expressConnectMiddleware({
      routes: crpcRoutesHandler,
    }) as unknown as RequestHandler; // FIXME this cast is not safe

    return { svcCount, crpcMiddlewareHandler };
  }

  async createCrpcRoutesHandler(): Promise<{
    readonly svcCount: number;
    readonly crpcRoutesHandler: (router: ConnectRouter) => void;
  }> {
    const fnTag = `${this.className}#registerCrpcServices()}`;
    const { log } = this;

    const crpcSvcRegistrations = await this.createCrpcServicesOfPlugins();
    const crpcSvcRegCount = crpcSvcRegistrations.length;

    log.debug("%s Obtained %o Crpc registrations.", fnTag, crpcSvcRegCount);

    const crpcRoutesHandler = (router: ConnectRouter) => {
      log.debug("%s expressConnectMiddleware() routes handler", fnTag);

      crpcSvcRegistrations.forEach((it) => {
        log.debug("%s Registering %s", fnTag, it.serviceName);
        router.service(it.definition, it.implementation, it.options);
      });
    };

    return { svcCount: crpcSvcRegCount, crpcRoutesHandler };
  }

  async startCrpcServer(): Promise<{
    readonly addressInfoCrpc: AddressInfo;
    readonly crpcUrl: string;
  }> {
    const fn = `${this.className}#startCrpcServer()`;
    const { log, options } = this;

    const { config } = options;
    const { crpcHost, crpcPort } = config;

    const { crpcRoutesHandler, svcCount } =
      await this.createCrpcRoutesHandler();

    log.debug("%s Registering %o CRPC routes handler(s).", fn, svcCount);

    await this.crpcServer.register(fastifyConnectPlugin, {
      routes: crpcRoutesHandler,
      shutdownTimeoutMs: 5000,
      grpc: true,
      grpcWeb: true,
    });
    log.debug("%s Fastify CRPC service registration OK", fn);

    const crpcUrl = await this.crpcServer.listen({
      host: crpcHost,
      port: crpcPort,
    });
    log.debug("%s Fastify listen() crpcUrl: %s", fn, crpcUrl);

    const [addressInfoCrpc, ...addresses] = this.crpcServer.addresses();
    log.debug("%s server is listening at", fn, addressInfoCrpc, addresses);
    return { crpcUrl, addressInfoCrpc };
  }

  async startGrpcServer(): Promise<AddressInfo> {
    const fnTag = `${this.className}#startGrpcServer()`;
    const { log } = this;
    const { logLevel } = this.options.config;
    const pluginRegistry = await this.getOrInitPluginRegistry();

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

      this.grpcServer.addService(
        default_service.org.hyperledger.cactus.cmd_api_server
          .DefaultServiceClient.service,
        new GrpcServerApiServer(),
      );

      log.debug("Installing gRPC services of IPluginGrpcService instances...");
      pluginRegistry.getPlugins().forEach(async (x: ICactusPlugin) => {
        if (!isIPluginGrpcService(x)) {
          this.log.debug("%s skipping %s instance", fnTag, x.getPackageName());
          return;
        }
        const opts = { logLevel };
        log.info("%s Creating gRPC service of: %s", fnTag, x.getPackageName());

        const svcPairs = await x.createGrpcSvcDefAndImplPairs(opts);
        log.debug("%s Obtained %o gRPC svc pairs OK", fnTag, svcPairs.length);

        svcPairs.forEach(({ definition, implementation }) => {
          const svcNames = Object.values(definition).map((x) => x.originalName);
          const svcPaths = Object.values(definition).map((x) => x.path);
          log.debug("%s Adding gRPC svc names %o ...", fnTag, svcNames);
          log.debug("%s Adding gRPC svc paths %o ...", fnTag, svcPaths);
          this.grpcServer.addService(definition, implementation);
          log.debug("%s Added gRPC svc OK ...", fnTag);
        });

        log.info("%s Added gRPC service of: %s OK", fnTag, x.getPackageName());
      });
      log.debug("%s Installed all IPluginGrpcService instances OK", fnTag);

      this.grpcServer.bindAsync(
        grpcHostAndPort,
        grpcTlsCredentials,
        (error: Error | null, port: number) => {
          if (error) {
            this.log.error("%s Binding gRPC failed: ", fnTag, error);
            return reject(new RuntimeError(fnTag + " gRPC bindAsync:", error));
          } else {
            this.log.info("%s gRPC server bound to port %o OK", fnTag, port);
          }

          const portStr = port.toString(10);
          this.boundGrpcHostPort = grpcHost.concat(":").concat(portStr);
          log.info("%s boundGrpcHostPort=%s", fnTag, this.boundGrpcHostPort);

          const family = determineAddressFamily(grpcHost);
          resolve({ address: grpcHost, port, family });
        },
      );
    });
  }

  async createCrpcServicesOfPlugins(): Promise<
    ICrpcSvcRegistration<ServiceType>[]
  > {
    const fnTag = `${this.className}#startCrpcServer()`;
    const { log } = this;
    const { logLevel } = this.options.config;
    const pluginRegistry = await this.getOrInitPluginRegistry();

    log.debug("Installing crpc services of IPluginCrpcService instances...");

    const out: ICrpcSvcRegistration<ServiceType>[] = [];

    const plugins = pluginRegistry.getPlugins();

    const tasksDone = plugins.map(async (x: ICactusPlugin) => {
      if (!isIPluginCrpcService(x)) {
        this.log.debug("%s skipping %s instance", fnTag, x.getPackageName());
        return;
      }
      const opts = { logLevel };
      log.info("%s Creating crpc service of: %s", fnTag, x.getPackageName());

      const svcRegistrations = await x.createCrpcSvcRegistrations(opts);
      log.debug("%s Got %o Crpc svc defs:", fnTag, svcRegistrations.length);

      svcRegistrations.forEach((it) => out.push(it));
    });

    await Promise.all(tasksDone);

    return out;
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

    const { svcCount, crpcMiddlewareHandler } =
      await this.createCrpcExpressMiddlewareHandler();

    this.log.info("Registered %o Crpc services OK", svcCount);

    app.use(crpcMiddlewareHandler);

    app.use(compression() as RequestHandler);

    const apiCorsDomainCsv = this.options.config.apiCorsDomainCsv;
    const allowedDomains = apiCorsDomainCsv.split(",");
    const corsMiddleware = this.createCorsMiddleware(allowedDomains);
    app.use(corsMiddleware);
    app.use(bodyParser.json({ limit: "50mb" }));
    // Add custom replacer to handle bigint responses correctly
    app.set("json replacer", this.stringifyBigIntReplacer);

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

    if (authorizerO.isPresent()) {
      const socketIoAuthorizer = authorizeSocket({
        ...authzConf.socketIoJwtOptions,
        onAuthentication: (decodedToken) => {
          this.log.debug("Socket authorized OK: %o", decodedToken);
        },
      });
      this.wsApi.use(socketIoAuthorizer as never);
    }

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
      const csv = nonExempts.map((ep) => ep.getPath()).join(", ");
      const { E_NON_EXEMPT_UNPROTECTED_ENDPOINTS } = ApiServer;
      throw new Error(`${E_NON_EXEMPT_UNPROTECTED_ENDPOINTS} ${csv}`);
    }
  }

  createCorsMiddleware(allowedDomains: string[]): RequestHandler {
    const allDomainsOk = allowedDomains.includes("*");

    const corsOptionsDelegate: CorsOptionsDelegate<CorsRequest> = (
      req,
      callback,
    ) => {
      const origin = req.headers["origin"];
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

  /**
   * `JSON.stringify` replacer function to handle BigInt.
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
   */
  private stringifyBigIntReplacer(
    _key: string,
    value: bigint | unknown,
  ): string | unknown {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  }
}
