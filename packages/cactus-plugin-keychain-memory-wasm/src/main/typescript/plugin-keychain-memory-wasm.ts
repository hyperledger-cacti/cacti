import { Express } from "express";

import { Checks } from "@hyperledger/cactus-common";
import { Logger, LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";

import {
  ICactusPluginOptions,
  IPluginKeychain,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import OAS from "../json/openapi.json";
import { SetKeychainEntryV1Endpoint } from "./webservices/set-keychain-entry-endpoint-v1";
import { GetKeychainEntryV1Endpoint } from "./webservices/get-keychain-entry-endpoint-v1";
import { DeleteKeychainEntryV1Endpoint } from "./webservices/delete-keychain-entry-endpoint-v1";
import { HasKeychainEntryV1Endpoint } from "./webservices/has-keychain-entry-endpoint-v1";

export interface IPluginKeychainMemoryWasmOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  wasmPlugin: IPluginKeychain;
  keychainId: string;
}

export class PluginKeychainMemoryWasm
  implements IPluginKeychain, IPluginWebService {
  public static readonly CLASS_NAME = "PluginKeychainMemoryWasm";

  private readonly wasm: IPluginKeychain;
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return PluginKeychainMemoryWasm.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainMemoryWasmOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);
    Checks.nonBlankString(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(opts.wasmPlugin, `${fnTag} arg options.wasmPlugin`);

    this.wasm = opts.wasmPlugin;

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
    this.log.warn(
      `Never use ${this.className} in production. ` +
        `It does not support encryption. It stores everything in plain text.`,
    );
  }

  public async shutdown(): Promise<void> {
    return;
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
      new SetKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
      new GetKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
      new DeleteKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
      new HasKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
    ];

    this.endpoints = endpoints;

    return endpoints;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-memory-wasm`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async get(key: string): Promise<string> {
    const value = this.wasm.get(key);
    if (value) {
      return value;
    } else {
      throw new Error(`Keychain entry for "${key}" not found.`);
    }
  }

  async has(key: string): Promise<boolean> {
    return this.wasm.has(key);
  }

  async set(key: string, value: string): Promise<void> {
    return this.wasm.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.wasm.delete(key);
  }
}
