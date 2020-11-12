import {
  ICactusPlugin,
  ICactusPluginOptions,
  IPluginKeychain,
  PluginAspect,
} from "@hyperledger/cactus-core-api";

import { Checks } from "@hyperledger/cactus-common";

export interface IPluginKeychainOptions extends ICactusPluginOptions {
  backend: Map<string, any>;
}

export class PluginKeychainMemory implements ICactusPlugin, IPluginKeychain {
  private readonly instanceId: string;

  constructor(public readonly options: IPluginKeychainOptions) {
    const fnTag = `PluginKeychainMemory#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    if (!options.backend) {
      options.backend = new Map();
    }
    this.instanceId = this.options.instanceId;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-memory`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.KEYCHAIN;
  }

  async rotateEncryptionKeys(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getEncryptionAlgorithm(): string {
    return "no-encryption-used-by-this-plugin";
  }

  async get<T>(key: string): Promise<T> {
    return this.options.backend.get(key);
  }

  async has(key: string): Promise<boolean> {
    return this.options.backend.has(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.options.backend.set(key, value);
  }

  async delete<T>(key: string): Promise<void> {
    this.options.backend.delete(key);
  }
}
