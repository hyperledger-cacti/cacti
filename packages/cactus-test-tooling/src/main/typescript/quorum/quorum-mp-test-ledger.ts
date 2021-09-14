import {
  Bools,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import Dockerode, { Container } from "dockerode";
import { RuntimeError } from "run-time-error";
import { Optional } from "typescript-optional";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../public-api";
import { EventEmitter } from "events";

export interface IQuorumMpTestLedgerConstructorOptions {
  readonly logLevel?: LogLevelDesc;
  readonly imageName?: string;
  readonly imageTag?: string;
  readonly emitContainerLogs?: boolean;
  readonly autoRemove?: boolean;
  readonly envVars?: Map<string, string>;
}

export class QuorumMpTestLedger implements ITestLedger {
  public static readonly CLASS_NAME = "QuorumMpTestLedger";

  private readonly _imageName: string;
  private readonly _imageTag: string;
  private readonly _imageFqn: string;
  private readonly _emitContainerLogs: boolean;
  private readonly _autoRemove: boolean;
  private readonly _envVars: Map<string, string>;
  private _containerId: Optional<string>;

  private readonly log: Logger;

  constructor(public readonly options: IQuorumMpTestLedgerConstructorOptions) {
    this._containerId = Optional.empty();

    this._imageName =
      options.imageName ||
      "ghcr.io/hyperledger/cactus-quorum-multi-party-all-in-one";
    this._imageTag =
      options.imageTag || "2021-08-20--quorum-multi-party-ledger";
    this._imageFqn = `${this._imageName}:${this._imageTag}`;

    this._envVars = options.envVars || new Map();
    this._emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;
    this._autoRemove = Bools.isBooleanStrict(options.autoRemove)
      ? (options.autoRemove as boolean)
      : true;
    const level = this.options.logLevel || "INFO";
    const label = QuorumMpTestLedger.CLASS_NAME;

    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Instantiated ${label} OK`);
  }

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

  public async start(omitPull = false): Promise<Container> {
    const docker = new Dockerode();
    if (this.containerId.isPresent()) {
      this.log.warn(`Container ID provided. Will not start new one.`);
      const container = docker.getContainer(this.containerId.get());
      return container;
    }
    if (!omitPull) {
      await Containers.pullImage(this.imageFqn);
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
          const logOptions = { follow: true, stderr: true, stdout: true };
          const logStream = await container.logs(logOptions);
          logStream.on("data", (data: Buffer) => {
            const fnTag = `[${this.imageFqn}]`;
            this.log.debug(`${fnTag} %o`, data.toString("utf-8"));
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

  public get container(): Optional<Container> {
    const docker = new Dockerode();
    return this.containerId.isPresent()
      ? Optional.ofNonNull(docker.getContainer(this.containerId.get()))
      : Optional.empty();
  }

  public async pullFile(filePath: string): Promise<string> {
    const docker = new Dockerode();
    const container = docker.getContainer(this.containerId.get());

    return await Containers.pullFile(container, filePath);
  }

  public async stop(): Promise<unknown> {
    return Containers.stop(this.container.get());
  }

  public async destroy(): Promise<unknown> {
    return this.container.get().remove();
  }

  public async getKeys(): Promise<unknown> {
    const containerId = this.containerId.orElseThrow(
      () => new RuntimeError("Invalid state: Dockerode Container ID not set."),
    );
    const container = await Containers.getById(containerId);

    const member1HttpPort = await Containers.getPublicPort(20000, container);
    const member1WsPort = await Containers.getPublicPort(20001, container);
    const member1PrivateUrlPort = await Containers.getPublicPort(
      9081,
      container,
    );

    const member2HttpPort = await Containers.getPublicPort(20002, container);
    const member2WsPort = await Containers.getPublicPort(20003, container);
    const member2PrivateUrlPort = await Containers.getPublicPort(
      9082,
      container,
    );

    const member3HttpPort = await Containers.getPublicPort(20004, container);
    const member3WsPort = await Containers.getPublicPort(20005, container);
    const member3PrivateUrlPort = await Containers.getPublicPort(
      9083,
      container,
    );

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
      quorum: {
        member1: {
          name: "member1",
          url: `http://127.0.0.1:${member1HttpPort}`,
          wsUrl: `http://127.0.0.1:${member1WsPort}`,
          privateUrl: `http://127.0.0.1:${member1PrivateUrlPort}`,
          privateKey:
            "b9a4bd1539c15bcc83fa9078fe89200b6e9e802ae992f13cd83c853f16e8bed4",
          accountAddress: "f0e2db6c8dc6c681bb5d6ad121a107f300e9b2b5",
        },
        member2: {
          name: "member2",
          url: `http://127.0.0.1:${member2HttpPort}`,
          wsUrl: `http://127.0.0.1:${member2WsPort}`,
          privateUrl: `http://127.0.0.1:${member2PrivateUrlPort}`,
          privateKey:
            "f18166704e19b895c1e2698ebc82b4e007e6d2933f4b31be23662dd0ec602570",
          accountAddress: "ca843569e3427144cead5e4d5999a3d0ccf92b8e",
        },
        member3: {
          name: "member3",
          url: `http://127.0.0.1:${member3HttpPort}`,
          wsUrl: `http://127.0.0.1:${member3WsPort}`,
          privateUrl: `http://127.0.0.1:${member3PrivateUrlPort}`,
          privateKey:
            "4107f0b6bf67a3bc679a15fe36f640415cf4da6a4820affaac89c8b280dfd1b3",
          accountAddress: "0fbdc686b912d7722dc86510934589e0aaf3b55a",
        },
      },
    };
  }
}
