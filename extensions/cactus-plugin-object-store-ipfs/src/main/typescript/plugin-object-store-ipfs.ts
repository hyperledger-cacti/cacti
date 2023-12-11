import path from "path";
import type { Express } from "express";
import { RuntimeError } from "run-time-error-cjs";
import {
  Logger,
  Checks,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import type {
  IPluginObjectStore,
  ICactusPluginOptions,
  IWebServiceEndpoint,
  GetObjectRequestV1,
  GetObjectResponseV1,
  HasObjectRequestV1,
  HasObjectResponseV1,
  SetObjectRequestV1,
  SetObjectResponseV1,
} from "@hyperledger/cactus-core-api";

import OAS from "../json/openapi.json";

import { GetObjectEndpointV1 } from "./web-services/get-object-endpoint-v1";
import { SetObjectEndpointV1 } from "./web-services/set-object-endpoint-v1";
import { HasObjectEndpointV1 } from "./web-services/has-object-endpoint-v1";
import {
  LikeIpfsHttpClient,
  isLikeIpfsHttpClient,
  Options,
} from "./kubo-rpc-client-types";

export const K_IPFS_JS_HTTP_ERROR_FILE_DOES_NOT_EXIST =
  "HTTPError: file does not exist";

export interface IPluginObjectStoreIpfsOptions extends ICactusPluginOptions {
  readonly logLevel?: LogLevelDesc;
  readonly parentDir: string;
  readonly ipfsClientOrOptions: Options | LikeIpfsHttpClient;
}

export class PluginObjectStoreIpfs implements IPluginObjectStore {
  public static readonly CLASS_NAME = "PluginObjectStoreIpfs";

  private ipfs: LikeIpfsHttpClient | undefined;
  private readonly log: Logger;
  private readonly instanceId: string;
  private readonly parentDir: string;

  public get className(): string {
    return PluginObjectStoreIpfs.CLASS_NAME;
  }

  /**
   * We use dynamic import for kubo-rpc-client since it's ESM and we can't import it normally.
   * This methods will load the module and initialize local IPFS client based on ctor arguments.
   */
  private async initIpfs(): Promise<void> {
    if (isLikeIpfsHttpClient(this.opts.ipfsClientOrOptions)) {
      this.ipfs = this.opts.ipfsClientOrOptions;
    } else if (this.opts.ipfsClientOrOptions) {
      const { create } = await import("kubo-rpc-client");
      this.ipfs = create(this.opts.ipfsClientOrOptions);
    } else {
      const errorMessage = `initIpfs Need either "ipfsClient" or "ipfsClientOptions" to construct ${this.className} Neither was provided.`;
      throw new RuntimeError(errorMessage);
    }
  }

  /**
   * Get IPFS client or initialize it from constructor args.
   * @returns `LikeIpfsHttpClient` or exception
   */
  private async getIpfs(): Promise<LikeIpfsHttpClient> {
    if (!this.ipfs) {
      await this.initIpfs();
    }

    if (!this.ipfs) {
      throw new Error("Could not instantiate ipfs http client");
    }

    return this.ipfs;
  }

  constructor(public readonly opts: IPluginObjectStoreIpfsOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.nonBlankString(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.parentDir, `${fnTag} options.parentDir`);
    Checks.truthy(opts.ipfsClientOrOptions, `${fnTag} ipfsClientOrOptions`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.parentDir = this.opts.parentDir;
    this.instanceId = this.opts.instanceId;

    this.log.info(`Created ${this.className}. InstanceID=${opts.instanceId}`);
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public async onPluginInit(): Promise<unknown> {
    return this.initIpfs();
  }

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log, opts } = this;
    const { logLevel } = opts;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [
      new GetObjectEndpointV1({
        logLevel,
        plugin: this,
      }),
      new SetObjectEndpointV1({
        logLevel,
        plugin: this,
      }),
      new HasObjectEndpointV1({
        logLevel,
        plugin: this,
      }),
    ];
    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-object-store-ipfs`;
  }

  public getKeyPath(req: { key: string }): string {
    return path.join(this.parentDir, req.key);
  }

  public async get(req: GetObjectRequestV1): Promise<GetObjectResponseV1> {
    const keyPath = this.getKeyPath(req);
    const ipfs = await this.getIpfs();
    const chunksIterable = ipfs.files.read(keyPath);
    const chunks = [];
    for await (const chunk of chunksIterable) {
      chunks.push(chunk);
    }
    const totalLength = chunks.reduce((sum, it) => sum + it.length, 0);
    const array = new Uint8Array(totalLength);

    chunks.reduce((sum, it) => {
      array.set(it, sum);
      return sum + it.length;
    }, 0);

    const value = Buffer.from(array).toString("base64");
    return { key: req.key, value };
  }

  public async has(req: HasObjectRequestV1): Promise<HasObjectResponseV1> {
    const checkedAt = new Date().toJSON();
    const keyPath = this.getKeyPath(req);
    try {
      const ipfs = await this.getIpfs();
      const statResult = await ipfs.files.stat(keyPath);
      this.log.debug(`StatResult for ${req.key}: %o`, statResult);
      return { key: req.key, checkedAt, isPresent: true };
    } catch (ex) {
      if (ex?.stack?.includes(K_IPFS_JS_HTTP_ERROR_FILE_DOES_NOT_EXIST)) {
        const msg = `Stat ${req.key} failed with error message containing phrase "${K_IPFS_JS_HTTP_ERROR_FILE_DOES_NOT_EXIST}" Returning isPresent=false ...`;
        this.log.debug(msg);
        return { key: req.key, checkedAt, isPresent: false };
      } else {
        throw new RuntimeError(`Checking presence of ${req.key} crashed:`, ex);
      }
    }
  }

  public async set(req: SetObjectRequestV1): Promise<SetObjectResponseV1> {
    const keyPath = this.getKeyPath(req);
    try {
      this.log.debug(`Seting object ${keyPath} in IPFS...`);
      const buffer = Buffer.from(req.value, "base64");
      const ipfs = await this.getIpfs();
      await ipfs.files.write(keyPath, buffer, {
        create: true,
        parents: true,
      });
    } catch (ex) {
      throw new RuntimeError(`Can't set object ${keyPath}. Write failed:`, ex);
    }
    return {
      key: req.key,
    };
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }
}
