import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";

export interface ISATPGatewayRunnerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  serverPort?: number;
  clientPort?: number;
  apiPort?: number;
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
  configFile?: string;
  outputLogFile?: string;
  errorLogFile?: string;
  knexDir?: string;
}

export const SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "2024-10-30T19-54-20-dev-5e06263e0",
  containerImageName: "ghcr.io/hyperledger/cacti-satp-hermes-gateway",
  serverPort: 3010,
  clientPort: 3011,
  apiPort: 4010,
});

export const SATP_GATEWAY_RUNNER_OPTIONS_JOI_SCHEMA: Joi.Schema =
  Joi.object().keys({
    containerImageVersion: Joi.string().min(1).required(),
    containerImageName: Joi.string().min(1).required(),
    serverPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
    clientPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
    apiPort: Joi.number().integer().positive().min(1024).max(65535).required(),
  });

export class SATPGatewayRunner implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly serverPort: number;
  public readonly clientPort: number;
  public readonly apiPort: number;
  public readonly emitContainerLogs: boolean;
  public readonly configFile?: string;
  public readonly outputLogFile?: string;
  public readonly errorLogFile?: string;
  public readonly knexDir?: string;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: ISATPGatewayRunnerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(`SATPGatewayRunner#ctor options was falsy.`);
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.containerImageName;
    this.serverPort =
      options.serverPort || SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.serverPort;
    this.clientPort =
      options.clientPort || SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.clientPort;
    this.apiPort =
      options.apiPort || SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.apiPort;
    this.configFile = options.configFile;
    this.outputLogFile = options.outputLogFile;
    this.errorLogFile = options.errorLogFile;
    this.knexDir = options.knexDir;

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this.validateConstructorOptions();
    const label = "satp-gateway-runner";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "SATPGatewayRunner#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getServerHost(): Promise<string> {
    const hostPort = await this.getHostPort(this.serverPort);
    this.log.debug(`getServerHost: ${hostPort}`);
    return `http://localhost:${hostPort}`;
  }

  public async getClientHost(): Promise<string> {
    const hostPort = await this.getHostPort(this.clientPort);
    this.log.debug(`getClientHost: ${hostPort}`);
    return `http://localhost:${hostPort}`;
  }

  public async getApiHost(): Promise<string> {
    const hostPort = await this.getHostPort(this.apiPort);
    this.log.debug(`getApiHost: ${hostPort}`);
    return `http://localhost:${hostPort}`;
  }

  public async getHostPort(configuredPort: number): Promise<number> {
    if (this.container) {
      const containerInfo = await this.getContainerInfo();
      if (containerInfo.HostConfig.NetworkMode === "host") {
        // When using host network mode, return the configured port
        return configuredPort;
      } else {
        // For other network modes, use the existing logic
        return await Containers.getPublicPort(configuredPort, containerInfo);
      }
    } else {
      throw new Error("Container not started");
    }
  }

  private createDockerHostConfig(): Docker.HostConfig {
    const hostConfig: Docker.HostConfig = {
      PublishAllPorts: true,
      Binds: [],
      NetworkMode: "host",
    };

    if (this.configFile) {
      const containerPath = "/opt/cacti/satp-hermes/gateway-config.json";
      hostConfig.Binds!.push(`${this.configFile}:${containerPath}:ro`);
    }

    if (this.outputLogFile) {
      const containerPath =
        "/opt/cacti/satp-hermes/log/satp-gateway-output.log";
      hostConfig.Binds!.push(`${this.outputLogFile}:${containerPath}:rw`);
    }

    if (this.errorLogFile) {
      const containerPath = "/opt/cacti/satp-hermes/log/satp-gateway-error.log";
      hostConfig.Binds!.push(`${this.errorLogFile}:${containerPath}:rw`);
    }

    if (this.knexDir) {
      const containerPath = "/opt/cacti/satp-hermes/src/knex/";
      hostConfig.Binds!.push(`${this.knexDir}:${containerPath}:rw`);
    }
    return hostConfig;
  }

  public async start(omitPull = false): Promise<Container> {
    const imageFqn = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    if (!omitPull) {
      this.log.debug(`Pulling container image ${imageFqn} ...`);
      await Containers.pullImage(imageFqn, {}, "DEBUG");
      this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);
    }

    this.log.debug(`Starting container with image: ${imageFqn}...`);
    return new Promise<Container>((resolve, reject) => {
      const hostConfig: Docker.HostConfig = this.createDockerHostConfig();

      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            [`${this.serverPort}/tcp`]: {}, // SERVER_PORT
            [`${this.clientPort}/tcp`]: {}, // CLIENT_PORT
            [`${this.apiPort}/tcp`]: {}, // API_PORT
          },
          HostConfig: hostConfig,
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
          const fnTag = `[${this.getContainerImageName()}]`;
          await Containers.streamLogs({
            container: this.getContainer(),
            tag: fnTag,
            log: this.log,
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

  public async waitForHealthCheck(timeoutMs = 60000): Promise<void> {
    const fnTag = "SATPGatewayRunner#waitForHealthCheck()";
    const startedAt = Date.now();
    let isHealthy = false;
    do {
      if (Date.now() >= startedAt + timeoutMs) {
        throw new Error(`${fnTag} timed out (${timeoutMs}ms)`);
      }
      const { Status, State } = await this.getContainerInfo();
      this.log.debug(`ContainerInfo.Status=%o, State=O%`, Status, State);
      isHealthy = Status.endsWith("(healthy)");
      if (!isHealthy) {
        await new Promise((resolve2) => setTimeout(resolve2, 1000));
      }
    } while (!isHealthy);
    this.log.debug(`Left waitForHealthCheck`);
  }

  public stop(): Promise<unknown> {
    const fnTag = "SATPGatewayRunner#stop()";
    return new Promise((resolve, reject) => {
      if (this.container) {
        this.container.stop({}, (err: unknown, result: unknown) => {
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
  }

  public destroy(): Promise<unknown> {
    const fnTag = "SATPGatewayRunner#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  public async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(
        `SATPGatewayRunner#getContainerInfo() no container with ID "${this.containerId}"`,
      );
    }
  }

  private validateConstructorOptions(): void {
    const validationResult = SATP_GATEWAY_RUNNER_OPTIONS_JOI_SCHEMA.validate({
      containerImageVersion: this.containerImageVersion,
      containerImageName: this.containerImageName,
      serverPort: this.serverPort,
      clientPort: this.clientPort,
      apiPort: this.apiPort,
    });

    if (validationResult.error) {
      throw new Error(
        `SATPGatewayRunner#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
