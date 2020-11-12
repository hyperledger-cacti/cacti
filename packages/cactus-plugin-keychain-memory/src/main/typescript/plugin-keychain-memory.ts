import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPluginOptions,
  PluginAspect,
} from "@hyperledger/cactus-core-api";

export interface IPluginKeychainMemoryOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  backend?: Map<string, any>;
  keychainId: string;
}

export class PluginKeychainMemory {
  public static readonly CLASS_NAME = "PluginKeychainMemory";

  private readonly backend: Map<string, any>;
  private readonly log: Logger;
  private readonly instanceId: string;

  public get className() {
    return PluginKeychainMemory.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainMemoryOptions) {
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

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
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
