import Docker, { Container, ContainerInfo } from "dockerode";
import isPortReachable from "is-port-reachable";
import Joi from "joi";
import { EventEmitter } from "events";
import { ITestLedger } from "../i-test-ledger";
import { Stream } from "stream";

const OPTS_SCHEMA: Joi.Schema = Joi.object().keys({
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string().min(1).required(),
  httpPort: Joi.number().integer().positive().min(1024).max(65535).required(),
});

const CTOR_DEFAULTS = Object.freeze({
  imageVersion: "0.4.2",
  imageName: "ealen/echo-server",
  httpPort: 8080,
});

export interface IHttpEchoContainerConstructorOptions {
  imageVersion?: string;
  imageName?: string;
  httpPort?: number;
}

export const HTTP_ECHO_CONTAINER_CTOR_DEFAULTS = CTOR_DEFAULTS;

export const HTTP_ECHO_CONTAINER_OPTS_SCHEMA = OPTS_SCHEMA;

export class HttpEchoContainer implements ITestLedger {
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly httpPort: number;

  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: IHttpEchoContainerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(`HttpEchoContainer#ctor options was falsy.`);
    }
    this.imageVersion = options.imageVersion || CTOR_DEFAULTS.imageVersion;
    this.imageName = options.imageName || CTOR_DEFAULTS.imageName;
    this.httpPort = options.httpPort || CTOR_DEFAULTS.httpPort;

    this.validateConstructorOptions();
  }

  public getContainer(): Container {
    if (!this.container) {
      throw new Error(`HttpEchoContainer Wasn't started yet, cannot get it.`);
    } else {
      return this.container;
    }
  }

  public getImageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public async getHttpHost(): Promise<string> {
    const ipAddress: string = await this.getContainerIpAddress();
    return `http://${ipAddress}:${this.httpPort}`;
  }

  public async start(): Promise<Container> {
    const containerNameAndTag = this.getImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    await this.pullContainerImage(containerNameAndTag);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        containerNameAndTag,
        ["--port", this.httpPort.toString(10)],
        [],
        {
          ExposedPorts: {
            [`${this.httpPort}/tcp`]: {},
          },
          // This is a workaround needed for macOS which has issues with routing
          // to docker container's IP addresses directly...
          // https://stackoverflow.com/a/39217691
          PublishAllPorts: true,
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
        const host = "127.0.0.1";
        const hostPort = await this.getPublicHttpPort();
        try {
          let reachable = false;
          do {
            reachable = await isPortReachable(hostPort, { host });
            await new Promise((resolve2) => setTimeout(resolve2, 100));
          } while (!reachable);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public stop(): Promise<Container> {
    return new Promise((resolve, reject) => {
      if (this.container) {
        this.container.stop({}, (err: unknown, result: Container) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } else {
        return reject(
          new Error(
            `HttpEchoContainer#stop() Container was not running to begin with.`,
          ),
        );
      }
    });
  }

  public destroy(): Promise<Container> {
    if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(
        new Error(
          `HttpEchoContainer#destroy() Container was never created, nothing to destroy.`,
        ),
      );
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = "HttpEchoContainer#getContainerInfo()";
    const docker = new Docker();
    const image = this.getImageName();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no image found: "${image}"`);
    }
  }

  public async getPublicHttpPort(): Promise<number> {
    const fnTag = "HttpEchoContainer#getRpcApiPublicPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { httpPort: thePort } = this;
    const { Ports: ports } = aContainerInfo;

    if (ports.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = ports.find((x) => x.PrivatePort === thePort);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${thePort} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${thePort} mapped to localhost`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${thePort}`);
    }
  }

  public async getContainerIpAddress(): Promise<string> {
    const fnTag = "HttpEchoContainer#getContainerIpAddress()";
    const aContainerInfo = await this.getContainerInfo();

    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(`${fnTag} container not on any networks`);
      } else {
        // return IP address of container on the first network that we found it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(`${fnTag} cannot find container image ${this.imageName}`);
    }
  }

  private pullContainerImage(containerNameAndTag: string): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const docker = new Docker();
      docker.pull(containerNameAndTag, (pullError: unknown, stream: Stream) => {
        if (pullError) {
          reject(pullError);
        } else {
          docker.modem.followProgress(
            stream,
            (progressError: unknown, output: unknown[]) => {
              if (progressError) {
                reject(progressError);
              } else {
                resolve(output);
              }
            },
          );
        }
      });
    });
  }

  private validateConstructorOptions(): void {
    const validationResult = OPTS_SCHEMA.validate({
      imageVersion: this.imageVersion,
      imageName: this.imageName,
      httpPort: this.httpPort,
    });

    if (validationResult.error) {
      throw new Error(
        `HttpEchoContainer#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
