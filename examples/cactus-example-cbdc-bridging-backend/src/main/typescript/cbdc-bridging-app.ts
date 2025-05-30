import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ApiServer,
  ICactusApiServerOptions,
} from "@hyperledger/cactus-cmd-api-server";

import { CbdcBridgingAppDummyInfrastructure } from "./infrastructure/cbdc-bridging-app-dummy-infrastructure";
import { DefaultApi as FabricApi } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { DefaultApi as BesuApi } from "@hyperledger/cactus-plugin-ledger-connector-besu";

export interface ICbdcBridgingApp {
  apiHost: string;
  logLevel?: LogLevelDesc;
  apiServerOptions?: ICactusApiServerOptions;
  disableSignalHandlers?: true;
}

export type ShutdownHook = () => Promise<void>;
export class CbdcBridgingApp {
  private readonly log: Logger;
  private readonly shutdownHooks: ShutdownHook[];
  readonly infrastructure: CbdcBridgingAppDummyInfrastructure;

  public constructor(public readonly options: ICbdcBridgingApp) {
    const fnTag = "CbdcBridgingApp#constructor()";

    if (!options) {
      throw new Error(`${fnTag} options parameter is falsy`);
    }
    const { logLevel } = options;

    const level = logLevel || "INFO";
    const label = "cbdc-bridging-app";
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.shutdownHooks = [];

    this.infrastructure = new CbdcBridgingAppDummyInfrastructure({
      logLevel: level,
    });
  }

  public async start() /*: Promise<IStartInfo> */ {
    this.log.debug(`Starting CBDC Bridging App...`);

    if (!this.options.disableSignalHandlers) {
      exitHook((callback: IAsyncExitHookDoneCallback) => {
        this.stop().then(callback);
      });
      this.log.debug(`Registered signal handlers for graceful auto-shutdown`);
    }

    await this.infrastructure.start();

    this.onShutdown(() => this.infrastructure.stop());
  }

  public async stop(): Promise<void> {
    for (const hook of this.shutdownHooks) {
      await hook(); // FIXME add timeout here so that shutdown does not hang
    }
  }

  public onShutdown(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
  }
}

export interface IStartInfo {
  readonly apiServer1: ApiServer;
  readonly apiServer2: ApiServer;
  readonly besuApiClient: BesuApi;
  readonly fabricApiClient: FabricApi;
}
