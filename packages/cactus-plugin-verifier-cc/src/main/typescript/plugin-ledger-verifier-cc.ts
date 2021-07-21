import { Server } from "http";
import { Server as SecureServer } from "https";

import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";
import { promisify } from "util";
import { Optional } from "typescript-optional";
import Web3 from "web3";

import {
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { WatchBlocksV1 } from "./generated/openapi/typescript-axios";

import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.besu.keychain_not_found";

export interface IPluginVerifierCcOptions extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
}

export class PluginVerifierCc implements ICactusPlugin, IPluginWebService {
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly web3: Web3;
  private readonly pluginRegistry: PluginRegistry;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginVerifierCc";

  public get className(): string {
    return PluginVerifierCc.CLASS_NAME;
  }

  constructor(public readonly options: IPluginVerifierCcOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.rpcApiWsHost, `${fnTag} options.rpcApiWsHost`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    const web3WsProvider = new Web3.providers.WebsocketProvider(
      this.options.rpcApiWsHost,
    );
    this.web3 = new Web3(web3WsProvider);
    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
    Checks.truthy(this.pluginRegistry, `${fnTag} options.pluginRegistry`);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public async shutdown(): Promise<void> {
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
    }
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { web3 } = this;
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.debug(`New Socket connected. ID=${socket.id}`);

      socket.on(WatchBlocksV1.Subscribe, () => {
        new WatchBlocksV1Endpoint({ web3, socket, logLevel }).subscribe();
      });
    });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-verifier-cc`;
  }
}
