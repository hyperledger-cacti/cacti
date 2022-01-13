import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";
import { Containers } from "../common/containers";
import { Stream } from "stream";

/*
 * Contains options for Postgres container
 */
export interface IPostgresTestContainerConstructorOptions {
  readonly imageVersion?: string;
  readonly imageName?: string;
  readonly postgresPort?: number;
  readonly envVars?: string[];
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
}

/*
 * Provides default options for Postgres container
 */
export const POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS = Object.freeze({
  imageVersion: "9.5-alpine",
  imageName: "postgres",
  postgresPort: 5432,
  envVars: ["POSTGRES_USER=postgres", "POSTGRES_PASSWORD=my-secret-password"],
});

/*
 * Provides validations for Postgres container's options
 */
export const POSTGRES_TEST_CONTAINER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    imageVersion: Joi.string().min(5).required(),
    imageName: Joi.string().min(1).required(),
    postgresPort: Joi.number().min(1024).max(65535).required(),
    envVars: Joi.array().allow(null).required(),
  },
);

export class PostgresTestContainer implements ITestLedger {
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly postgresPort: number;
  public readonly envVars: string[];
  public readonly emitContainerLogs: boolean;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: IPostgresTestContainerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(`PostgresTestContainer#ctor options was falsy.`);
    }
    this.imageVersion =
      options.imageVersion ||
      POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.imageVersion;
    this.imageName =
      options.imageName || POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.imageName;
    this.postgresPort =
      options.postgresPort ||
      POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.postgresPort;
    this.envVars =
      options.envVars || POSTGRES_TEST_CONTAINER_DEFAULT_OPTIONS.envVars;

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

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

  public getimageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public async getPostgresPortHost(): Promise<string> {
    const ipAddress = "127.0.0.1";
    const hostPort: number = await this.getPostgresPort();
    return `http://${ipAddress}:${hostPort}`;
  }

  public async getFileContents(filePath: string): Promise<string> {
    const response = await this.getContainer().getArchive({
      path: filePath,
    });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents = "";
      extract.on("entry", async (header: unknown, stream, next) => {
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
    const imageFqn = this.getimageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    this.log.debug(`Pulling container image ${imageFqn} ...`);
    await this.pullContainerImage(imageFqn);
    this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          Env: this.envVars,
          Healthcheck: {
            Test: ["CMD-SHELL", "pg_isready -U postgres"],
            Interval: 1000000000, // 1 second
            Timeout: 3000000000, // 3 seconds
            Retries: 299,
            StartPeriod: 3000000000, // 3 seconds
          },
          HostConfig: {
            PublishAllPorts: true,
            AutoRemove: true,
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
        this.log.debug(`Started container OK. Waiting for healthcheck...`);
        this.container = container;
        this.containerId = container.id;
        if (this.emitContainerLogs) {
          const logOptions = { follow: true, stderr: true, stdout: true };
          const logStream = await container.logs(logOptions);
          logStream.on("data", (data: Buffer) => {
            this.log.debug(`[${imageFqn}] %o`, data.toString("utf-8"));
          });
        }
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

  public stop(): Promise<unknown> {
    return Containers.stop(this.container as Container);
  }

  public destroy(): Promise<unknown> {
    const fnTag = "PostgresTestContainer#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const image = this.getimageName();
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
      throw new Error(`${fnTag} cannot find image: ${this.imageName}`);
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
    const validationResult = POSTGRES_TEST_CONTAINER_OPTIONS_JOI_SCHEMA.validate(
      {
        imageVersion: this.imageVersion,
        imageName: this.imageName,
        postgresPort: this.postgresPort,
        envVars: this.envVars,
      },
    );

    if (validationResult.error) {
      throw new Error(
        `PostgresTestContainer#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
