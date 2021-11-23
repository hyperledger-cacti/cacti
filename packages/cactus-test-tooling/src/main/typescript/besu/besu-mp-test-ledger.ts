import Dockerode from "dockerode";
import type { Container } from "dockerode";
import { Optional } from "typescript-optional";
import {
  Logger,
  Checks,
  LogLevelDesc,
  Bools,
} from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { Containers } from "../common/containers";
import { RuntimeError } from "run-time-error";
import { EventEmitter } from "events";

export interface IBesuMpTestLedgerOptions {
  readonly logLevel?: LogLevelDesc;
  readonly imageName?: string;
  readonly imageTag?: string;
  readonly emitContainerLogs?: boolean;
  readonly autoRemove?: boolean;
  readonly envVars?: Map<string, string>;
}

export class BesuMpTestLedger {
  public static readonly CLASS_NAME = "BesuMpTestLedger";

  private readonly log: Logger;

  private readonly _imageName: string;
  private readonly _imageTag: string;
  private readonly _imageFqn: string;
  private readonly _emitContainerLogs: boolean;
  private readonly _autoRemove: boolean;
  private readonly _envVars: Map<string, string>;

  private _containerId: Optional<string>;

  public get containerId(): Optional<string> {
    return this._containerId;
  }

  public get envVars(): Map<string, string> {
    return this._envVars;
  }

  public get imageTag(): string {
    return this._imageTag;
  }

  public get imageName(): string {
    return this._imageName;
  }

  public get imageFqn(): string {
    return this._imageFqn;
  }

  public get autoRemove(): boolean {
    return this._autoRemove;
  }

  public get emitContainerLogs(): boolean {
    return this._emitContainerLogs;
  }

  public get container(): Optional<Container> {
    const docker = new Dockerode();
    return this.containerId.isPresent()
      ? Optional.ofNonNull(docker.getContainer(this.containerId.get()))
      : Optional.empty();
  }

  public get className(): string {
    return BesuMpTestLedger.CLASS_NAME;
  }

  constructor(public readonly options: IBesuMpTestLedgerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this._containerId = Optional.empty();

    this._imageName =
      options.imageName ||
      "ghcr.io/hyperledger/cactus-besu-all-in-one-multi-party";
    this._imageTag = options.imageTag || "2021-08-13--private-tx";
    this._imageFqn = `${this._imageName}:${this._imageTag}`;

    this._envVars = options.envVars || new Map();
    this._emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;
    this._autoRemove = Bools.isBooleanStrict(options.autoRemove)
      ? (options.autoRemove as boolean)
      : true;
    const level = this.options.logLevel || "INFO";
    const label = this.className;

    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Instantiated ${this.className} OK`);
  }

  public async start(omitPull = false): Promise<Container> {
    const docker = new Dockerode();
    if (this.containerId.isPresent()) {
      this.log.warn(`Container ID provided. Will not start new one.`);
      const container = docker.getContainer(this.containerId.get());
      return container;
    }
    if (!omitPull) {
      await Containers.pullImage(this.imageFqn, {}, this.options.logLevel);
    }

    const dockerEnvVars: string[] = new Array(...this.envVars).map(
      (pairs) => `${pairs[0]}=${pairs[1]}`,
    );

    const createOptions = {
      HostConfig: {
        AutoRemove: this.autoRemove,
        Env: dockerEnvVars,
        Privileged: true,
        PublishAllPorts: true,
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
          const fnTag = `[${this.imageFqn}]`;
          await Containers.streamLogs({
            container: this.container.get(),
            tag: fnTag,
            log: this.log,
          });
        }

        try {
          await Containers.waitForHealthCheck(this.containerId.get());
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

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public async getKeys() {
    const containerId = this.containerId.orElseThrow(
      () => new RuntimeError("Invalid state: Dockerode Container ID not set."),
    );
    const container = await Containers.getById(containerId);
    const member1HttpPort = await Containers.getPublicPort(20000, container);
    const member1WsPort = await Containers.getPublicPort(20001, container);

    const member2HttpPort = await Containers.getPublicPort(20002, container);
    const member2WsPort = await Containers.getPublicPort(20003, container);

    const member3HttpPort = await Containers.getPublicPort(20004, container);
    const member3WsPort = await Containers.getPublicPort(20005, container);

    const ethSignerProxyPort = await Containers.getPublicPort(18545, container);

    // WARNING: the keys here are demo purposes ONLY.
    // Please use a tool like Orchestrate or EthSigner for production, rather than hard coding private keys
    return {
      tessera: {
        member1: {
          publicKey: "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo=",
        },
        member2: {
          publicKey: "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=",
        },
        member3: {
          publicKey: "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg=",
        },
      },
      besu: {
        member1: {
          url: `http://127.0.0.1:${member1HttpPort}`,
          wsUrl: `ws://127.0.0.1:${member1WsPort}`,
          privateKey:
            "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",
        },
        member2: {
          url: `http://127.0.0.1:${member2HttpPort}`,
          wsUrl: `ws://127.0.0.1:${member2WsPort}`,
          privateKey:
            "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
        },
        member3: {
          url: `http://127.0.0.1:${member3HttpPort}`,
          wsUrl: `ws://127.0.0.1:${member3WsPort}`,
          privateKey:
            "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
        },
        ethsignerProxy: {
          url: `http://127.0.0.1:${ethSignerProxyPort}`,
          accountAddress: "9b790656b9ec0db1936ed84b3bea605873558198",
        },
      },
    };
  }
}
