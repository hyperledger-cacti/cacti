import { IPluginKeychain, PluginAspect } from "@hyperledger/cactus-core-api";

export interface IPluginKeychainOptions {
  backend: Map<string, any>;
}

export class PluginKeychainMemory implements IPluginKeychain {
  constructor(public readonly options: IPluginKeychainOptions) {
    if (!options) {
      throw new Error(`PluginKeychainMemory#ctor options falsy.`);
    }
    if (!options.backend) {
      options.backend = new Map();
    }
  }

  public getId(): string {
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
