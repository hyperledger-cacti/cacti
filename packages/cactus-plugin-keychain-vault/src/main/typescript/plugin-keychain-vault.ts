import { Server } from "http";
import { Server as SecureServer } from "https";

import { Express } from "express";
import { Optional } from "typescript-optional";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  ICactusPluginOptions,
  IPluginWebService,
  IWebServiceEndpoint,
  PluginAspect,
} from "@hyperledger/cactus-core-api";
import { GetKeychainEntryEndpointV1 } from "./web-services/get-keychain-entry-endpoint-v1";
import { SetKeychainEntryEndpointV1 } from "./web-services/set-keychain-entry-endpoint-v1";

export interface IPluginKeychainVaultOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  backend?: Map<string, any>;
  keychainId: string;
}

export class PluginKeychainVault implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginKeychainVault";

  private readonly backend: Map<string, any>;
  private readonly log: Logger;
  private readonly instanceId: string;

  public get className() {
    return PluginKeychainVault.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainVaultOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);

    this.backend = opts.backend || new Map();
    Checks.truthy(this.backend, `${fnTag} arg options.backend`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
    this.log.warn(
      `Never use ${this.className} in production. ` +
        `It does not support encryption. It stores everything in plain text.`
    );
  }
  public async installWebServices(
    expressApp: Express
  ): Promise<IWebServiceEndpoint[]> {
    const endpoints: IWebServiceEndpoint[] = [];

    {
      const ep = new GetKeychainEntryEndpointV1({
        logLevel: this.opts.logLevel,
      });
      ep.registerExpress(expressApp);
      endpoints.push(ep);
    }

    {
      const ep = new SetKeychainEntryEndpointV1({
        logLevel: this.opts.logLevel,
      });
      ep.registerExpress(expressApp);
      endpoints.push(ep);
    }

    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async shutdown(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-vault`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.KEYCHAIN;
  }

  async rotateEncryptionKeys(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getEncryptionAlgorithm(): string {
    return null as any;
  }

  async get<T>(key: string): Promise<T> {
    return this.backend.get(key);
  }

  async has(key: string): Promise<boolean> {
    return this.backend.has(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.backend.set(key, value);
  }

  async delete<T>(key: string): Promise<void> {
    this.backend.delete(key);
  }
}
