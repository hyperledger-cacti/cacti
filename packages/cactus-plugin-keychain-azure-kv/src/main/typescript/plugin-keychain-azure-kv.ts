import type { Express } from "express";
import {
  UsernamePasswordCredential,
  DefaultAzureCredential,
} from "@azure/identity";
import { KeyVaultSecret, SecretClient } from "@azure/keyvault-secrets";

import OAS from "../json/openapi.json";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  ICactusPluginOptions,
  IPluginKeychain,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { SetKeychainEntryEndpoint } from "./web-services/set-keychain-entry-endpoint";
import { GetKeychainEntryEndpoint } from "./web-services/get-keychain-entry-endpoint";
import { DeleteKeychainEntryEndpoint } from "./web-services/delete-keychain-entry-endpoint";
import { HasKeychainEntryEndpoint } from "./web-services/has-keychain-entry-endpoint";
import {
  AccessTokenCredential,
  IAccessTokenCredentialOptions,
} from "./credentials/access-token-credential";
import {
  IRefreshTokenCredentialOptions,
  RefreshTokenCredential,
} from "./credentials/refresh-token-credential";

// TODO: Writing the getExpressRequestHandler() method for

export enum AzureCredentialType {
  LocalFile = "LOCAL_FILE",
  /**
   * Enables authentication to Microsoft Entra ID with a user's username and password.
   * This credential requires a high degree of trust so you should only use it
   * when other, more secure credential types can't be used.
   * @deprecated — UsernamePasswordCredential is deprecated.
   * Use a more secure credential. See https://aka.ms/azsdk/identity/mfa for details.
   */
  InMemory = "IN_MEMORY",
  /**
   * @see {@link AccessTokenCredential}
   */
  AccessToken = "ACCESS_TOKEN",
  /**
   * @see {@link RefreshTokenCredential}
   */
  RefreshToken = "REFRESH_TOKEN",
}

export interface IAzureInMemoryCredentials {
  azureTenantId: string;
  azureClientId: string;
  azureUsername: string;
  azurePassword: string;
}

export interface IPluginKeychainAzureKvOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  keychainId: string;
  instanceId: string;
  azureEndpoint: string;
  azureCredentialType?: AzureCredentialType;
  azureInMemoryCredentials?: IAzureInMemoryCredentials;
  refreshTokenCredentials?: IRefreshTokenCredentialOptions;
  accessTokenCredentials?: IAccessTokenCredentialOptions;
  backend?: SecretClient;
}

export class PluginKeychainAzureKv
  implements ICactusPlugin, IPluginWebService, IPluginKeychain
{
  public static readonly CLASS_NAME = "PluginKeychainAzureKv";

  readonly vaultUrl: string;
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private azureKvClient: SecretClient;

  public get className(): string {
    return PluginKeychainAzureKv.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainAzureKvOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);
    Checks.nonBlankString(opts.azureEndpoint, `${fnTag} options.azureEndpoint`);
    if (
      opts.azureCredentialType &&
      opts.azureInMemoryCredentials &&
      opts.azureCredentialType == AzureCredentialType.InMemory
    ) {
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azureTenantId,
        `${fnTag} opts.azureInMemoryCredentials.azureTenantId`,
      );
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azureClientId,
        `${fnTag} opts.azureInMemoryCredentials.azureClientId`,
      );
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azureUsername,
        `${fnTag} opts.azureInMemoryCredentials.azureUsername`,
      );
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azurePassword,
        `${fnTag} opts.azureInMemoryCredentials.azurePassword`,
      );
    }

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.vaultUrl = this.opts.azureEndpoint;

    if (opts.backend) {
      this.azureKvClient = opts.backend;
    } else if (
      opts.azureCredentialType == AzureCredentialType.InMemory &&
      opts.azureInMemoryCredentials
    ) {
      this.log.warn("Do not use AzureCredentialType.InMemory in production.");
      const azureCredentials = new UsernamePasswordCredential(
        opts.azureInMemoryCredentials.azureTenantId,
        opts.azureInMemoryCredentials.azureClientId,
        opts.azureInMemoryCredentials.azureUsername,
        opts.azureInMemoryCredentials.azurePassword,
      );
      this.azureKvClient = new SecretClient(this.vaultUrl, azureCredentials);
    } else if (
      opts.azureCredentialType === AzureCredentialType.AccessToken &&
      opts.accessTokenCredentials
    ) {
      this.log.debug("Using AccessTokenCredential type Azure KV SecretClient");
      const credential = new AccessTokenCredential({
        ...opts.accessTokenCredentials,
        logLevel: opts.logLevel,
      });
      this.azureKvClient = new SecretClient(this.vaultUrl, credential);
    } else if (
      opts.azureCredentialType === AzureCredentialType.RefreshToken &&
      opts.refreshTokenCredentials
    ) {
      this.log.debug("Using RefreshTokenCredential type Azure KV SecretClient");
      const credential = new RefreshTokenCredential({
        ...opts.refreshTokenCredentials,
        logLevel: opts.logLevel,
      });
      this.azureKvClient = new SecretClient(this.vaultUrl, credential);
    } else {
      this.log.debug("Credentials: falling back to DefaultAzureCredential");
      const azureCredentials = new DefaultAzureCredential();
      this.azureKvClient = new SecretClient(this.vaultUrl, azureCredentials);
    }

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [
      new SetKeychainEntryEndpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
      new GetKeychainEntryEndpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
      new DeleteKeychainEntryEndpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
      new HasKeychainEntryEndpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
    ];
    this.endpoints = endpoints;

    return endpoints;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-vault`;
  }

  public getEncryptionAlgorithm(): string {
    return null as unknown as string;
  }

  public getAzureKvClient(): SecretClient {
    return this.azureKvClient;
  }

  async get(key: string): Promise<string> {
    const keyVaultSecret: KeyVaultSecret =
      await this.azureKvClient.getSecret(key);
    if (keyVaultSecret) {
      const result = keyVaultSecret.value;
      return result as string;
    } else {
      throw new Error(`${key} secret not found`);
    }
  }

  /**
   * Detects the presence of a key by trying to read it and then
   * observing whether an HTTP 404 NOT FOUND error is returned or
   * not and deciding whether the keychain has the entry ot not
   * based on this.
   */

  async has(key: string): Promise<boolean> {
    const keyVaultSecret = await this.azureKvClient.getSecret(key);
    if (keyVaultSecret) {
      return true;
    } else {
      return false;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.azureKvClient.setSecret(key, value as unknown as string);
  }

  async delete(key: string): Promise<void> {
    await this.azureKvClient.beginDeleteSecret(key);
  }
}
