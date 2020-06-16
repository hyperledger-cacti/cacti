import Docker, { Container } from "dockerode";
import isPortReachable from "is-port-reachable";
import Joi from "joi";
import { EventEmitter } from "events";
import { ITestLedger } from "../i-test-ledger";

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

  constructor(
    public readonly options: IHttpEchoContainerConstructorOptions = {}
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
          ExposedPorts: {},
          Hostconfig: {
            PortBindings: {},
          },
        },
        {},
        (err: any) => {
          if (err) {
            reject(err);
          }
        }
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        const host: string = await this.getContainerIpAddress();
        try {
          let reachable: boolean = false;
          do {
            reachable = await isPortReachable(this.httpPort, { host });
            await new Promise((resolve2) => setTimeout(resolve2, 100));
          } while (!reachable);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public stop(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.container) {
        this.container.stop({}, (err: any, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } else {
        return reject(
          new Error(
            `HttpEchoContainer#stop() Container was not running to begin with.`
          )
        );
      }
    });
  }

  public destroy(): Promise<any> {
    if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(
        new Error(
          `HttpEchoContainer#destroy() Container was never created, nothing to destroy.`
        )
      );
    }
  }

  public async getContainerIpAddress(): Promise<string> {
    const docker = new Docker();
    const imageName = this.getImageName();
    const containerInfos: Docker.ContainerInfo[] = await docker.listContainers(
      {}
    );

    const aContainerInfo = containerInfos.find((ci) => ci.Image === imageName);
    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(
          `HttpEchoContainer#getContainerIpAddress() no network found: ${JSON.stringify(
            NetworkSettings
          )}`
        );
      } else {
        // return IP address of container on the first network that we found it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(
        `HttpEchoContainer#getContainerIpAddress() cannot find container image ${this.imageName}`
      );
    }
  }

  private pullContainerImage(containerNameAndTag: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const docker = new Docker();
      docker.pull(containerNameAndTag, (pullError: any, stream: any) => {
        if (pullError) {
          reject(pullError);
        } else {
          docker.modem.followProgress(
            stream,
            (progressError: any, output: any[]) => {
              if (progressError) {
                reject(progressError);
              } else {
                resolve(output);
              }
            },
            (event: any) => null // ignore the spammy docker download log, we get it in the output variable anyway
          );
        }
      });
    });
  }

  private validateConstructorOptions(): void {
    const validationResult = Joi.validate<IHttpEchoContainerConstructorOptions>(
      {
        imageVersion: this.imageVersion,
        imageName: this.imageName,
        httpPort: this.httpPort,
      },
      OPTS_SCHEMA
    );

    if (validationResult.error) {
      throw new Error(
        `HttpEchoContainer#ctor ${validationResult.error.annotate()}`
      );
    }
  }
}
