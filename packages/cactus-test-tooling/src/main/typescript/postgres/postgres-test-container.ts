//import all packages
import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";
//import { Containers } from "../common/containers";
//import { NumberLiteralType } from "typescript";
//import { DefaultSerializer } from "v8";
//import { DEFAULTS } from "ts-node";

/*
 * Contains options for Postgres container
 */
export interface IPostgresTestContainerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  postgresPort?: number;
  envVars?: string[];
  logLevel?: LogLevelDesc;
}

/*
 * Provides default options for Postgres container
 */
export const POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "9.5-alpine",
  containerImageName: "postgres",
  postgresPort: 5432,
  envVars: ["POSTGRES_USER=postgres", "POSTGRES_PASSWORD=mysecretpassword"],
});

/*
 * Provides validations for Postgres container's options
 */
export const POSTGRES_TEST_CONTAINER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    containerImageVersion: Joi.string().min(5).required(),
    containerImageName: Joi.string().min(1).required(),
    postgresPort: Joi.number().min(1024).max(65535).required(),
    envVars: Joi.array().allow(null).required(),
  },
);

export class PostgresTestContainer implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly postgresPort: number;
  public readonly envVars: string[];

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: IPostgresTestContainerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(`PostgresTestContainer#ctor options was falsy.`);
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.containerImageName;
    this.postgresPort =
      options.postgresPort ||
      POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.postgresPort;
    this.envVars =
      options.envVars || POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.envVars;

    this.validateConstructorOptions();
    const label = "postgres-test-container";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "PostgresTestContainer#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getPostgresPortHost(): Promise<string> {
    const ipAddress = "127.0.0.1";
    const hostPort: number = await this.getPostgresPort();
    return `http://${ipAddress}:${hostPort}`;
  }

  public async getFileContents(filePath: string): Promise<string> {
    const response: any = await this.getContainer().getArchive({
      path: filePath,
    });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents = "";
      extract.on("entry", async (header: any, stream, next) => {
        stream.on("error", (err: Error) => {
          reject(err);
        });
        const chunks: string[] = await Streams.aggregate<string>(stream);
        fileContents += chunks.join("");
        stream.resume();
        next();
      });

      extract.on("finish", () => {
        resolve(fileContents);
      });

      response.pipe(extract);
    });
  }

  public async start(): Promise<Container> {
    const imageFqn = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();
    this.log.debug(`Creating Iroha network ...`);
    try {
      docker.createNetwork({
        Name: "iroha-network",
        Driver: "bridge",
        // IPAM: {
        //   Config: [
        //     {
        //       Subnet: "172.20.0.0/16",
        //       IPRange: "172.20.10.0/24",
        //       Gateway: "172.20.10.12",
        //     },
        //   ],
        // },
      });
    } catch (err) {
      throw new Error(err);
    }

    this.log.debug(`Pulling container image ${imageFqn} ...`);
    await this.pullContainerImage(imageFqn);
    this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          name: "some-postgres",
          ExposedPorts: {
            [`${this.postgresPort}/tcp`]: {}, // postgres Port - HTTP
          },
          PublishAllPorts: true,
          Env: this.envVars,
          Healthcheck: {
            Test: ["CMD-SHELL", "pg_isready -U postgres"],
            Interval: 1000000000, // 1 second
            Timeout: 3000000000, // 3 seconds
            Retries: 299,
            StartPeriod: 3000000000, // 1 second
          },
          HostConfig: {
            PortBindings: {
              "5432/tcp": [
                {
                  HostPort: "5432",
                },
              ],
            },
            //AutoRemove: true,
            NetworkMode: "iroha-network",
          },
          // NetworkingConfig: {
          //   EndpointsConfig: "iroha-network",
          // },
        },
        {},
        (err: unknown) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.log.debug(`Started container OK. Waiting for healthcheck...`);
        this.container = container;
        this.containerId = container.id;
        try {
          await this.waitForHealthCheck();
          this.log.debug(`Healthcheck passing OK.`);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs = 180000): Promise<void> {
    const fnTag = "PostgresTestContainer#waitForHealthCheck()";
    // const httpUrl = await this.getRpcApiHttpHost();
    const startedAt = Date.now();
    let isHealthy = false;
    do {
      if (Date.now() >= startedAt + timeoutMs) {
        throw new Error(`${fnTag} timed out (${timeoutMs}ms)`);
      }
      const containerInfo = await this.getContainerInfo();
      this.log.debug(`ContainerInfo.Status=%o`, containerInfo.Status);
      this.log.debug(`ContainerInfo.State=%o`, containerInfo.State);
      isHealthy = containerInfo.Status.endsWith("(healthy)");
      if (!isHealthy) {
        await new Promise((resolve2) => setTimeout(resolve2, 1000));
      }
    } while (!isHealthy);
  }

  public stop(): Promise<any> {
    const fnTag = "PostgresTestContainer#stop()";
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
        return reject(new Error(`${fnTag} Container was not running.`));
      }
    });
    //return Containers.stop(this.getContainer());
  }

  public destroy(): Promise<any> {
    const fnTag = "PostgresTestContainer#destroy()";
    const docker = new Docker();
    try {
      docker.pruneNetworks(); //remove "iroha-network"
    } catch (ex) {
      this.log.warn(`Failed to prune docker network: `, ex);
    }
    try {
      docker.pruneVolumes(); //remove blockstore volume
    } catch (ex) {
      this.log.warn(`Failed to prune docker volume: `, ex);
    }
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(
        `PostgresTestContainer#getContainerInfo() no image "${image}"`,
      );
    }
  }

  public async getPostgresPort(): Promise<number> {
    const fnTag = "PostgresTestContainer#getPostgresPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { postgresPort: thePort } = this;
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
    const fnTag = "PostgresTestContainer#getContainerIpAddress()";
    const aContainerInfo = await this.getContainerInfo();

    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(`${fnTag} container not connected to any networks`);
      } else {
        // return IP address of container on the first network that we found
        // it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(`${fnTag} cannot find image: ${this.containerImageName}`);
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
          );
        }
      });
    });
  }

  private validateConstructorOptions(): void {
    const validationResult = Joi.validate<
      IPostgresTestContainerConstructorOptions
    >(
      {
        containerImageVersion: this.containerImageVersion,
        containerImageName: this.containerImageName,
        postgresPort: this.postgresPort,
        envVars: this.envVars,
      },
      POSTGRES_TEST_CONTAINER_OPTIONS_JOI_SCHEMA,
    );

    if (validationResult.error) {
      throw new Error(
        `PostgresTestContainer#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
