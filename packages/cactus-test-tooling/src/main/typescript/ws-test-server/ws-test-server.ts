import { EventEmitter } from "events";

import Docker, { Container } from "dockerode";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Containers } from "../common/containers";

export const WS_IDENTITY_IMAGE_NAME = `ghcr.io/brioux/ws-identity`;
export const WS_IDENTITY_IMAGE_VERSION = "0.0.1";
export const WS_IDENTITY_HTTP_PORT = 8700;

export interface IWsTestServerOptions {
  envVars?: string[];
  imageVersion?: string;
  imageName?: string;
  logLevel?: LogLevelDesc;
}

/**
 * > **Do not use this image in production.**
 *
 * Class responsible for programmatically managing a container that is running
 * ws-identity server
 */
export class WsTestServer {
  public static readonly CLASS_NAME = "WsTestServer";

  private readonly log: Logger;
  private readonly imageName: string;
  private readonly imageVersion: string;
  private readonly envVars: string[];

  private _container: Container | undefined;
  private _containerId: string | undefined;

  public get containerId(): string {
    Checks.nonBlankString(this._containerId, `${this.className}:_containerId`);
    return this._containerId as string;
  }

  public get container(): Container {
    Checks.nonBlankString(this._container, `${this.className}:_container`);
    return this._container as Container;
  }

  public get className(): string {
    return WsTestServer.CLASS_NAME;
  }

  public get imageFqn(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  constructor(public readonly options: IWsTestServerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.imageName = this.options.imageName || WS_IDENTITY_IMAGE_NAME;
    this.imageVersion = this.options.imageVersion || WS_IDENTITY_IMAGE_VERSION;
    this.envVars = this.options.envVars || [];

    this.log.info(`Created ${this.className} OK. Image FQN: ${this.imageFqn}`);
  }

  public async start(): Promise<Container> {
    if (this._container) {
      await this._container.stop();
      await this._container.remove();
    }
    const docker = new Docker();

    await Containers.pullImage(this.imageFqn, {}, this.options.logLevel);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            [`${WS_IDENTITY_HTTP_PORT}/tcp`]: {},
          },
          // This is a workaround needed for macOS which has issues with routing
          // to docker container's IP addresses directly...
          // https://stackoverflow.com/a/39217691
          PublishAllPorts: true,
          /*Env: [`WS_IDENTITY_PATH=${WS_IDENTITY_PATH}`, ...this.envVars],
          HostConfig: {
            // NetworkMode: "host",
            CapAdd: ["IPC_LOCK"],
            PublishAllPorts: true,
          },*/
          //Healthcheck: {
          //  Test: ["CMD-SHELL", "wget -O- http://127.0.0.1:8200/v1/sys/health"],
          //  Interval: 100 * 1000000,
          //},
        },
        {},
        (err: Error) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this._container = container;
        this._containerId = container.id;
        resolve(container);
        try {
          await Containers.waitForHealthCheck(this._containerId);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async stop(): Promise<void> {
    await Containers.stop(this._container as Docker.Container);
  }

  public destroy(): Promise<void> {
    const fnTag = `${this.className}#destroy()`;
    if (this._container) {
      return this._container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  public async getHostPortHttp(): Promise<number> {
    const fnTag = `${this.className}#getHostPortHttp()`;
    if (this._containerId) {
      const cInfo = await Containers.getById(this._containerId);
      return Containers.getPublicPort(WS_IDENTITY_HTTP_PORT, cInfo);
    } else {
      throw new Error(`${fnTag} Container ID not set. Did you call start()?`);
    }
  }
}
