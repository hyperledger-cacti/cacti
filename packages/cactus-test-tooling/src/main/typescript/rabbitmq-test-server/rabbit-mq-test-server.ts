import type { EventEmitter } from "events";
import { Optional } from "typescript-optional";
import { RuntimeError } from "run-time-error";
import type { Container, ContainerInfo } from "dockerode";
import Docker from "dockerode";
import { Logger, Checks, Bools } from "@hyperledger/cactus-common";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { Containers } from "../common/containers";
import { Config as SshConfig } from "node-ssh";

export interface IRabbitMQTestServerOptions {
  readonly publishAllPorts: boolean;
  readonly port: number;
  readonly logLevel?: LogLevelDesc;
  readonly imageName?: string;
  readonly imageTag?: string;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: Map<string, string>;
}

export class RabbitMQTestServer {
  public static readonly CLASS_NAME = "RabbitMQTestServer";

  public readonly logLevel: LogLevelDesc;
  public readonly imageName: string;
  public readonly imageTag: string;
  public readonly imageFqn: string;
  public readonly log: Logger;
  public readonly emitContainerLogs: boolean;
  public readonly publishAllPorts: boolean;
  public readonly envVars: Map<string, string>;
  public readonly port: number;
  private _containerId: Optional<string>;

  public get containerId(): Optional<string> {
    return this._containerId;
  }

  public get container(): Optional<Container> {
    const docker = new Docker();
    return this.containerId.isPresent()
      ? Optional.ofNonNull(docker.getContainer(this.containerId.get()))
      : Optional.empty();
  }

  public get className(): string {
    return RabbitMQTestServer.CLASS_NAME;
  }

  constructor(public readonly opts: IRabbitMQTestServerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);

    this.publishAllPorts = opts.publishAllPorts;
    this._containerId = Optional.empty();
    this.imageName = opts.imageName || "rabbitmq";
    this.port = opts.port || 5672;
    this.imageTag = opts.imageTag || "3.9-management";
    this.imageFqn = `${this.imageName}:${this.imageTag}`;
    this.envVars = opts.envVars || new Map();
    this.emitContainerLogs = Bools.isBooleanStrict(opts.emitContainerLogs)
      ? (opts.emitContainerLogs as boolean)
      : true;

    this.logLevel = opts.logLevel || "INFO";

    const level = this.logLevel;
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.log.debug(`Created instance of ${this.className} OK`);
  }
  public getContainerImageName(): string {
    return `${this.imageName}:${this.imageTag}`;
  }
  public async start(omitPull = false): Promise<Container> {
    const startTime = new Date();
    const docker = new Docker();
    if (this.containerId.isPresent()) {
      this.log.warn(`Container ID provided. Will not start new one.`);
      const container = docker.getContainer(this.containerId.get());
      return container;
    }
    if (!omitPull) {
      this.log.debug(`Pulling image ${this.imageFqn}...`);
      await Containers.pullImage(this.imageFqn);
      this.log.debug(`Pulled image ${this.imageFqn} OK`);
    }

    const dockerEnvVars: string[] = new Array(...this.envVars).map(
      (pairs) => `${pairs[0]}=${pairs[1]}`,
    );

    // TODO: dynamically expose ports for custom port mapping
    const createOptions = {
      Env: dockerEnvVars,

      /*
      Healthcheck: {
        Test: ["CMD-SHELL", `rabbitmq-diagnostics -q ping`],
        Interval: 1000000000, // 1 second
        Timeout: 3000000000, // 3 seconds
        Retries: 10,
        StartPeriod: 1000000000, // 1 second
      },
      */

      ExposedPorts: {
        "5672/tcp": {}, // Default port for RabbitMQ
        "7235/tcp": {}, // Default port for RabbitMQ
      },
      HostConfig: {
        AutoRemove: true,
        PublishAllPorts: this.publishAllPorts,
        Privileged: false,
        PortBindings: {
          "5672/tcp": [{ HostPort: "5672" }],
          "7235/tcp": [{ HostPort: "7235" }],
        },
      },
    };

    this.log.debug(`Starting ${this.imageFqn} with options: `, createOptions);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [],
        [],
        createOptions,
        {},
        (err: Error) => {
          if (err) {
            const errorMessage = `Failed to start container ${this.imageFqn}`;
            const exception = new RuntimeError(errorMessage, err);
            this.log.error(exception);
            reject(exception);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        const { id } = container;
        this.log.debug(`Started ${this.imageFqn} successfully. ID=${id}`);
        this._containerId = Optional.ofNonNull(id);

        if (this.emitContainerLogs) {
          const logOptions = { follow: true, stderr: true, stdout: true };
          const logStream = await container.logs(logOptions);
          logStream.on("data", (data: Buffer) => {
            const fnTag = `[${this.imageFqn}]`;
            this.log.debug(`${fnTag} %o`, data.toString("utf-8"));
          });
        }
        this.log.debug(`Registered container log stream callbacks OK`);

        try {
          this.log.debug(`Starting to wait for healthcheck... `);
          await this.waitForHealthCheck();
          this.log.debug(`Healthcheck passed OK`);
          const finalTime = new Date();
          this.log.debug(
            `EVAL-SETUP-INIT-RABBIT-MQ-SERVER:${
              finalTime.getTime() - startTime.getTime()
            }`,
          );
          resolve(container);
        } catch (ex) {
          this.log.error(ex);
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs = 180000): Promise<void> {
    const fnTag = "FabricTestLedgerV1#waitForHealthCheck()";
    const startedAt = Date.now();
    let reachable = false;
    do {
      try {
        const { State } = await this.getContainerInfo();
        reachable = State === "running";
      } catch (ex) {
        reachable = false;
        if (Date.now() >= startedAt + timeoutMs) {
          throw new Error(`${fnTag} timed out (${timeoutMs}ms) -> ${ex.stack}`);
        }
      }
      await new Promise((resolve2) => setTimeout(resolve2, 1000));
    } while (!reachable);
  }
  public async stop(): Promise<unknown> {
    return Containers.stop(this.container.get());
  }

  public async destroy(): Promise<unknown> {
    if (!this.container.get()) {
      return;
    }
    return this.container.get().remove();
  }

  public async getContainerIpAddress(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    return Containers.getContainerInternalIp(containerInfo);
  }

  // TODO
  public async getSshConfig(): Promise<SshConfig> {
    const fnTag = "RabbitMQTestServer#getSshConfig()";
    if (!this.container) {
      throw new Error(`${fnTag} - invalid state no container instance set`);
    }
    const filePath = "/etc/hyperledger/cactus/fabric-aio-image.key";
    const privateKey = await Containers.pullFile(
      (this.container as unknown) as Container,
      filePath,
    );
    const containerInfo = await this.getContainerInfo();
    const port = await Containers.getPublicPort(22, containerInfo);
    const sshConfig: SshConfig = {
      host: "localhost",
      privateKey,
      username: "root",
      port,
    };
    return sshConfig;
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = `${this.className}#getContainerInfo()`;
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find(
        (ci) => ci.Id == this.containerId.get(),
      );
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no image "${image}"`);
    }
  }
}
