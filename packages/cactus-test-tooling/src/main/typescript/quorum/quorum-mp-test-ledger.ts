import { EventEmitter } from "events";
import Docker, { Container, ContainerCreateOptions } from "dockerode";
import {
  Bools,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";

export interface IQuorumMultiPartyTestLedgerOptions {
  readonly containerImageName?: string;
  readonly containerImageVersion?: string;
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: string[];
  // For test development, attach to ledger that is already running, don't spin up new one
  readonly useRunningLedger?: boolean;
}

export class QuorumMultiPartyTestLedger implements ITestLedger {
  public readonly containerImageName: string;
  public readonly containerImageVersion: string;
  private readonly logLevel: LogLevelDesc;
  private readonly emitContainerLogs: boolean;
  private readonly useRunningLedger: boolean;
  private readonly envVars: string[];

  private readonly log: Logger;
  public container: Container | undefined;
  public containerId: string | undefined;

  constructor(public readonly options: IQuorumMultiPartyTestLedgerOptions) {
    // @todo Replace with hyperledger ghcr link when available
    this.containerImageName =
      options?.containerImageName ||
      "ghcr.io/hyperledger/cactus-quorum-multi-party-all-in-one";

    this.containerImageVersion =
      options?.containerImageVersion || "2021-08-20--quorum-multi-party-ledger";

    this.logLevel = options?.logLevel || "info";

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this.useRunningLedger = Bools.isBooleanStrict(options.useRunningLedger)
      ? (options.useRunningLedger as boolean)
      : false;

    this.envVars = options?.envVars || [];

    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: "quorum-multi-party-test-ledger",
    });
  }

  public get fullContainerImageName(): string {
    return [this.containerImageName, this.containerImageVersion].join(":");
  }

  public async start(omitPull = false): Promise<Container> {
    if (this.useRunningLedger) {
      this.log.info(
        "Search for already running Quorum Test Ledger because 'useRunningLedger' flag is enabled.",
      );
      this.log.info(
        "Search criteria - image name: ",
        this.fullContainerImageName,
        ", state: running",
      );
      const containerInfo = await Containers.getByPredicate(
        (ci) =>
          ci.Image === this.fullContainerImageName && ci.State === "running",
      );
      const docker = new Docker();
      this.containerId = containerInfo.Id;
      this.container = docker.getContainer(this.containerId);
      return this.container;
    }

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
      this.container = undefined;
      this.containerId = undefined;
    }

    if (!omitPull) {
      await Containers.pullImage(
        this.fullContainerImageName,
        {},
        this.logLevel,
      );
    }

    const createOptions: ContainerCreateOptions = {
      ExposedPorts: {
        "8545/tcp": {}, // HTTP RPC
        "8546/tcp": {}, // WS RPC
        "20000/tcp": {}, // Member1 HTTP RPC
        "20001/tcp": {}, // Member1 WS RPC
        "9081/tcp": {}, // Member1 Tessera
        "20002/tcp": {}, // Member2 HTTP RPC
        "20003/tcp": {}, // Member2 WS RPC
        "9082/tcp": {}, // Member2 Tessera
        "20004/tcp": {}, // Member3 HTTP RPC
        "20005/tcp": {}, // Member3 WS RPC
        "9083/tcp": {}, // Member3 Tessera
      },

      Env: this.envVars,

      HostConfig: {
        PublishAllPorts: true,
        Privileged: true,
      },
    };

    return new Promise<Container>((resolve, reject) => {
      const docker = new Docker();
      const eventEmitter: EventEmitter = docker.run(
        this.fullContainerImageName,
        [],
        [],
        createOptions,
        {},
        (err: any) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.fullContainerImageName}]`;
          await Containers.streamLogs({
            container: this.container,
            tag: fnTag,
            log: this.log,
          });
        }

        try {
          await Containers.waitForHealthCheck(this.containerId);
          resolve(container);
        } catch (ex) {
          this.log.error(ex);
          reject(ex);
        }
      });
    });
  }

  public async pullFile(filePath: string): Promise<string> {
    const docker = new Docker();
    this.container = docker.getContainer(this.containerId as string);

    return await Containers.pullFile(this.container, filePath);
  }

  public stop(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info("Ignore stop request because useRunningLedger is enabled.");
      return Promise.resolve();
    } else if (this.container) {
      return Containers.stop(this.container);
    } else {
      return Promise.reject(
        new Error(
          `QuorumMultiPartyTestLedger#destroy() Container was never created, nothing to stop.`,
        ),
      );
    }
  }

  public destroy(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info(
        "Ignore destroy request because useRunningLedger is enabled.",
      );
      return Promise.resolve();
    } else if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(
        new Error(
          `QuorumMultiPartyTestLedger#destroy() Container was never created, nothing to destroy.`,
        ),
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public async getKeys() {
    if (!this.containerId) {
      throw new Error("Missing container ID");
    }

    const container = await Containers.getById(this.containerId);

    const member1HttpPort = await Containers.getPublicPort(20000, container);
    const member1WsPort = await Containers.getPublicPort(20001, container);
    const member1PrivPort = await Containers.getPublicPort(9081, container);

    const member2HttpPort = await Containers.getPublicPort(20002, container);
    const member2WsPort = await Containers.getPublicPort(20003, container);
    const member2PrivPort = await Containers.getPublicPort(9082, container);

    const member3HttpPort = await Containers.getPublicPort(20004, container);
    const member3WsPort = await Containers.getPublicPort(20005, container);
    const member3PrivPort = await Containers.getPublicPort(9083, container);

    // This configuration comes from quorum-dev-quickstart@smart_contracts/scripts/keys.js
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
          url: `http://127.0.0.1:${member1HttpPort}`,
          wsUrl: `ws://127.0.0.1:${member1WsPort}`,
          privateUrl: `http://127.0.0.1:${member1PrivPort}`,
          privateKey:
            "b9a4bd1539c15bcc83fa9078fe89200b6e9e802ae992f13cd83c853f16e8bed4",
          accountAddress: "f0e2db6c8dc6c681bb5d6ad121a107f300e9b2b5",
        },
        member2: {
          url: `http://127.0.0.1:${member2HttpPort}`,
          wsUrl: `ws://127.0.0.1:${member2WsPort}`,
          privateUrl: `http://127.0.0.1:${member2PrivPort}`,
          privateKey:
            "f18166704e19b895c1e2698ebc82b4e007e6d2933f4b31be23662dd0ec602570",
          accountAddress: "ca843569e3427144cead5e4d5999a3d0ccf92b8e",
        },
        member3: {
          url: `http://127.0.0.1:${member3HttpPort}`,
          wsUrl: `ws://127.0.0.1:${member3WsPort}`,
          privateUrl: `http://127.0.0.1:${member3PrivPort}`,
          privateKey:
            "4107f0b6bf67a3bc679a15fe36f640415cf4da6a4820affaac89c8b280dfd1b3",
          accountAddress: "0fbdc686b912d7722dc86510934589e0aaf3b55a",
        },
      },
    };
  }
}
