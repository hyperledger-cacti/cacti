import { Server } from "http";
import { Server as SecureServer } from "https";

import { Express } from "express";
import { Optional } from "typescript-optional";
import Vault from "node-vault";

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
  keychainId: string;
  /**
   * API version to use when talking to the backing Vault instnace through
   * the NodeJS vault-node client.
   * Optional, defaults to `v1`
   */
  apiVersion?: string;
  /**
   * Network host where the backing Vault instance is accessible.
   */
  endpoint: string;
  /**
   * The `VAULT_TOKEN` which the backing Vault instance will accept as valid.
   */
  token: string;
}

export class PluginKeychainVault implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginKeychainVault";

  private readonly apiVersion: string;
  private readonly token: string;
  private readonly endpoint: string;
  private readonly log: Logger;
  private readonly instanceId: string;
  private readonly backend: Vault.client;

  public get className() {
    return PluginKeychainVault.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainVaultOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);

    Checks.nonBlankString(opts.endpoint, `${fnTag} options.endpoint`);
    Checks.nonBlankString(opts.token, `${fnTag} options.token`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.token = this.opts.token;
    this.endpoint = this.opts.endpoint;
    this.apiVersion = this.opts.apiVersion || "v1";

    this.backend = Vault({
      apiVersion: this.apiVersion,
      endpoint: this.endpoint,
      token: this.token,
    });
    this.log.info(`Created Vault backend OK. Endpoint=${this.endpoint}`);

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
  }

  public async installWebServices(
    expressApp: Express,
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
    const value = await this.backend.read(key);
    return value;
  }

  async has(key: string): Promise<boolean> {
    const list = await this.backend.list(key);
    return list.length > 0;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.backend.write(key, value);
  }

  async delete<T>(key: string): Promise<void> {
    await this.backend.delete(key);
  }
}
