import { EventEmitter } from "events";
import Docker, { Container, ContainerInfo } from "dockerode";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

/*
 * Provides default options for Corda connector server
 */
const DEFAULTS = Object.freeze({
  imageVersion: "latest",
  imageName: "copm-corda",
  apiPort: 9199,
  envVars: [],
});
export const COPM_CORDA_CONTAINER_DEFAULT_OPTIONS = DEFAULTS;

/*
 * Contains options for COPM Corda container
 */

export interface ICopmCordaContainerOptions {
  imageVersion?: string;
  imageName?: string;
  apiPort?: number;
  logLevel?: LogLevelDesc;
  rpcConfigJson: string;
  relayConfigJson: string;
  remoteOrgConfigJson: string;
  envVars?: string[];
}

/**
 * Class responsible for programmatically managing a container that is running
 * the image made for hosting a the Corda COPM implementation, written in
 * Kotlin
 **/
export class CopmCordaContainer {
  public static readonly CLASS_NAME = "CopmCordaContainer";

  private readonly log: Logger;
  private readonly envVars: string[];
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly apiPort: number;
  private container: Container | undefined;
  private containerId: string | undefined;

  public get className(): string {
    return CopmCordaContainer.CLASS_NAME;
  }

  constructor(public readonly opts: ICopmCordaContainerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);

    this.imageVersion = opts.imageVersion || DEFAULTS.imageVersion;
    this.imageName = opts.imageName || DEFAULTS.imageName;

    this.apiPort = opts.apiPort || DEFAULTS.apiPort;
    this.envVars = opts.envVars ? opts.envVars : DEFAULTS.envVars;

    const springAppConfig = {
      logging: {
        level: {
          root: "INFO",
          "com.copmCorda": "DEBUG",
        },
      },
    };
    this.envVars.push(
      `SPRING_APPLICATION_JSON=${JSON.stringify(springAppConfig)}`,
    );

    this.envVars.push(`COPM_RELAY_CONFIG=${opts.relayConfigJson}`);
    this.envVars.push(`COPM_REMOTE_CONFIG=${opts.remoteOrgConfigJson}`);
    this.envVars.push(`COPM_CORDA_RPC=${opts.rpcConfigJson}`);

    Checks.truthy(Array.isArray(this.envVars), `${fnTag}:envVars not an array`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainerId(): string {
    const fnTag = `${this.className}.getContainerId()`;
    Checks.nonBlankString(this.containerId, `${fnTag}::containerId`);
    return this.containerId as string;
  }

  public async start(): Promise<Container> {
    const imageFqn = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();
    this.log.info(`Starting container from image: ${imageFqn}`);
    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            [`9090/tcp`]: {},
          },
          Healthcheck: {
            Test: [
              "CMD-SHELL",
              // a way to use curl to test if grpc svr is up -- will return an error with http
              `curl -vv -i -X POST http://127.0.0.1:${this.apiPort}/ 2>&1 | grep "when not allowed"`,
            ],
            Interval: 5000000000, // 5 seconds
            Timeout: 3000000000, // 3 seconds
            Retries: 50,
            StartPeriod: 1000000000, // 5 second
          },
          Env: this.envVars,
          HostConfig: {
            PortBindings: {
              "9090/tcp": [{ HostPort: this.apiPort.toString() }],
            },
          },
        },
        {},
        (err: unknown) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;
        try {
          resolve(container);
        } catch (ex) {
          this.log.error(`Waiting for healthcheck to pass failed:`, ex);
          reject(ex);
        }
      });
    });
  }

  public stop(): Promise<unknown> {
    return this.getContainer().stop();
  }

  public destroy(): Promise<unknown> {
    const fnTag = `${this.className}.destroy()`;
    if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(
        new Error(`${fnTag} Container was never created, nothing to destroy.`),
      );
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = `${this.className}.getContainerInfo()`;
    const docker = new Docker();
    const containerInfos = await docker.listContainers({});
    const id = this.getContainerId();

    const aContainerInfo = containerInfos.find((ci) => ci.Id === id);

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no container with ID "${id}"`);
    }
  }

  public getContainer(): Container {
    const fnTag = `${this.className}.getContainer()`;
    if (!this.container) {
      throw new Error(`${fnTag} container not set on this instance yet.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }
}
