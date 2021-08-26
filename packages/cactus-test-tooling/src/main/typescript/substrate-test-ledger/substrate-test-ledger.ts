import type { EventEmitter } from "events";
import { Optional } from "typescript-optional";
import { RuntimeError } from "run-time-error";
import type { Container, ContainerInfo } from "dockerode";
import Docker from "dockerode";
import { Logger, Checks, Bools } from "@hyperledger/cactus-common";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { Containers } from "../common/containers";

export interface ISubstrateTestLedgerOptions {
  readonly publishAllPorts: boolean;
  readonly logLevel?: LogLevelDesc;
  readonly imageName?: string;
  readonly imageTag?: string;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: Map<string, string>;
}

export class SubstrateTestLedger {
  public static readonly CLASS_NAME = "SubstrateTestLedger";

  public readonly logLevel: LogLevelDesc;
  public readonly imageName: string;
  public readonly imageTag: string;
  public readonly imageFqn: string;
  public readonly log: Logger;
  public readonly emitContainerLogs: boolean;
  public readonly publishAllPorts: boolean;
  public readonly envVars: Map<string, string>;

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
    return SubstrateTestLedger.CLASS_NAME;
  }

  constructor(public readonly opts: ISubstrateTestLedgerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);

    this.publishAllPorts = opts.publishAllPorts;
    this._containerId = Optional.empty();
    this.imageName =
      opts.imageName || "ghcr.io/hyperledger/cactus-substrate-all-in-one";
    this.imageTag = opts.imageTag || "2021-09-24---feat-1274";
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
    const docker = new Docker();
    if (this.containerId.isPresent()) {
      this.log.debug(`Container ID provided. Will not start new one.`);
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
      Healthcheck: {
        Test: [
          "CMD-SHELL",
          `rustup --version && rustc --version && cargo --version`,
        ],
        Interval: 1000000000, // 1 second
        Timeout: 3000000000, // 3 seconds
        Retries: 10,
        StartPeriod: 1000000000, // 1 second
      },
      ExposedPorts: {
        "9944/tcp": {}, // OpenSSH Server - TCP
      },
      HostConfig: {
        AutoRemove: true,
        PublishAllPorts: this.publishAllPorts,
        Privileged: false,
        PortBindings: {
          "9944/tcp": [{ HostPort: "9944" }],
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
          await Containers.waitForHealthCheck(this.containerId.get());
          this.log.debug(`Healthcheck passed OK`);
          resolve(container);
        } catch (ex) {
          this.log.error(ex);
          reject(ex);
        }
      });
    });
  }

  public async stop(): Promise<unknown> {
    return Containers.stop(this.container.get());
  }

  public async destroy(): Promise<unknown> {
    return this.container.get().remove();
  }

  public async getContainerIpAddress(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    return Containers.getContainerInternalIp(containerInfo);
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = "FabricTestLedgerV1#getContainerInfo()";
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find(
        (ci) => ci.Id == this.containerId.toString(),
      );
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no image "${image}"`);
    }
  }

  // ./scripts/docker_run.sh ./target/release/node-template purge-chain --dev
  protected async purgeDevChain(): Promise<void> {
    throw new Error("TODO");
  }
}
