import { RequestHandler } from "express";
import expressJwt from "express-jwt";
import { Optional } from "typescript-optional";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  IPluginWebService,
  isIPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";

import { AuthorizationProtocol } from "../config/authorization-protocol";
import { ICactusApiServerOptions } from "../config/config-service";
import { IAuthorizationConfig } from "./i-authorization-config";
import { isExpressJwtOptions } from "./is-express-jwt-options-type-guard";

export const K_WARN_NO_AUTHORIZATION_PROTOCOL =
  "The API server configuration specified no authorization protocol. " +
  "All endpoints are exposed and unprotected. Do not use this in production!";

export interface IAuthorizationConfiguratorOptions {
  logLevel?: LogLevelDesc;
  pluginRegistry: PluginRegistry;
  apiServerOptions: ICactusApiServerOptions;
}

export class AuthorizerFactory {
  public static readonly CLASS_NAME = "AuthorizerFactory";
  public static readonly E_BAD_EXPRESS_JWT_OPTIONS =
    `Need valid express-jwt middleware configuration object. ` +
    `See the documentation of the express-jwt ` +
    `npm package for further details about what might be missing!`;

  private readonly log: Logger;
  private readonly pluginRegistry: PluginRegistry;
  private readonly plugins: IPluginWebService[];
  private _unprotectedEndpoints: IWebServiceEndpoint[] = [];
  private initialized = false;

  public get isInitialized(): boolean {
    return this.initialized;
  }

  public get className(): string {
    return AuthorizerFactory.CLASS_NAME;
  }

  constructor(public readonly opts: IAuthorizationConfiguratorOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(
      opts.pluginRegistry instanceof PluginRegistry,
      `${fnTag} opts.pluginRegistry instanceof PluginRegistry`,
    );

    this.pluginRegistry = opts.pluginRegistry;
    this.plugins = this.pluginRegistry
      .getPlugins()
      .filter((p) => isIPluginWebService(p)) as IPluginWebService[];

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Instantiated ${this.className} OK`);
  }

  private async createExpressJwtMiddleware(
    authzConf: IAuthorizationConfig,
  ): Promise<RequestHandler> {
    const fnTag = `${this.className}#createExpressJwtMiddleware()`;
    const { log } = this;
    const { E_BAD_EXPRESS_JWT_OPTIONS } = AuthorizerFactory;
    const { expressJwtOptions, socketIoPath } = authzConf;
    if (!isExpressJwtOptions(expressJwtOptions)) {
      throw new Error(`${fnTag}: ${E_BAD_EXPRESS_JWT_OPTIONS}`);
    }

    const options: expressJwt.Options = {
      audience: "org.hyperledger.cactus", // default that can be overridden
      ...expressJwtOptions,
    };
    const unprotectedEndpoints = this.unprotectedEndpoints.map((e) => {
      // type pathFilter = string | RegExp | { url: string | RegExp, methods?: string[], method?: string | string[] };
      return { url: e.getPath(), method: e.getVerbLowerCase() };
    });
    if (socketIoPath) {
      log.info("SocketIO path configuration detected: %o", socketIoPath);
      // const exemption = { url: new RegExp(`${socketIoPath}.*`), method: "get" };
      // unprotectedEndpoints.push(exemption as any);
      log.info(
        "Exempted SocketIO path from express-jwt authorization. Using @thream/socketio-jwt instead)",
      );
    }
    return expressJwt(options).unless({ path: unprotectedEndpoints });
  }

  /**
   * Creates an ExpressJS middleware (a request handler) that can be hooked
   * up to the Express web application with authorization as per the API
   * server configuration.
   * It is assumed by this method that the plugin registry has already been
   * initialized and now is containing the list of plugins that can be filtered
   * down to the list of plugins that also expose web services (without which
   * the authorization will not work properly)
   */
  public async createMiddleware(
    authorizationProtocol: AuthorizationProtocol,
    authzConf: IAuthorizationConfig,
  ): Promise<Optional<RequestHandler>> {
    const fnTag = `${this.className}#createAuthzMiddleware()`;
    const { log } = this;
    switch (authorizationProtocol) {
      case AuthorizationProtocol.NONE: {
        log.warn(K_WARN_NO_AUTHORIZATION_PROTOCOL);
        return Optional.empty();
      }
      case AuthorizationProtocol.JSON_WEB_TOKEN: {
        const handler = await this.createExpressJwtMiddleware(authzConf);
        return Optional.ofNonNull(handler);
      }
      default: {
        const acceptedCsv = Object.values(AuthorizationProtocol).join(",");
        const msg =
          `${fnTag} Unknown authz protocol: ${authorizationProtocol} ` +
          `Accepted values: ${acceptedCsv}`;
        throw new Error(msg);
      }
    }
  }

  public async initOnce(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    const { log } = this;
    log.debug(`Initializing ${this.className}...`);

    const endpoints = await this.getEndpoints();
    this._unprotectedEndpoints = await this.findUnprotectedEndpoints(endpoints);

    log.debug(`Initialized ${this.className} OK`);
    this.initialized = true;
  }

  public async getEndpoints(): Promise<IWebServiceEndpoint[]> {
    const { plugins } = this;
    const promises = plugins.map((p) => p.getOrCreateWebServices());
    const endpoints = await Promise.all(promises);
    return endpoints.flat();
  }

  public get unprotectedEndpoints(): IWebServiceEndpoint[] {
    const fnTag = `${this.className}#unprotectedEndpoints()`;
    if (this.isInitialized) {
      return this._unprotectedEndpoints;
    } else {
      throw new Error(`${fnTag} Need to call #initOnce() at least once.`);
    }
  }

  private async findUnprotectedEndpoints(
    endpoints: IWebServiceEndpoint[],
  ): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${this.className}#findUnprotectedEndpoints()`;
    Checks.truthy(Array.isArray(endpoints), `${fnTag} isArray(endpoints)`);

    const unprotectedEndpoints = [];

    for (const ep of endpoints) {
      const authzOptionsProvider = await ep.getAuthorizationOptionsProvider();
      const { isProtected: isProtected } = await authzOptionsProvider.get();
      if (!isProtected) {
        unprotectedEndpoints.push(ep);
      }
    }
    return unprotectedEndpoints;
  }
}
