import { EventEmitter } from "events";
import Docker, { Container } from "dockerode";
import { v4 as internalIpV4 } from "internal-ip";
import type { IndyVdrPoolConfig } from "@aries-framework/indy-vdr";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Containers } from "../common/containers";

export interface IIndyTestLedgerOptions {
  readonly containerImageName?: string;
  readonly containerImageVersion?: string;
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: string[];
  // For test development, attach to ledger that is already running, don't spin up new one
  readonly useRunningLedger?: boolean;
}

/**
 * Default values used by IndyTestLedger constructor.
 */
export const INDY_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageName: "ghcr.io/outsh/cactus-indy-all-in-one",
  containerImageVersion: "0.1",
  logLevel: "info" as LogLevelDesc,
  emitContainerLogs: false,
  envVars: [],
  useRunningLedger: false,
});

const INDY_ENDORSER_DID_SEED = "000000000000000000000000Steward1";
const GENESIS_FILE_PATH = "/var/lib/indy/sandbox/pool_transactions_genesis";
const DEFAULT_DID_INDY_NAMESPACE = "cacti:test";
const DEFAULT_POOL_ADDRESS = "172.16.0.2";
const DEFAULT_NODE1_PORT = "9701";
const DEFAULT_NODE1_CLIENT_PORT = "9702";
const DEFAULT_NODE2_PORT = "9703";
const DEFAULT_NODE2_CLIENT_PORT = "9704";
const DEFAULT_NODE3_PORT = "9705";
const DEFAULT_NODE3_CLIENT_PORT = "9706";
const DEFAULT_NODE4_PORT = "9707";
const DEFAULT_NODE4_CLIENT_PORT = "9708";

export class IndyTestLedger {
  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly containerImageName: string;
  private readonly containerImageVersion: string;
  private readonly envVars: string[];
  private readonly emitContainerLogs: boolean;
  public readonly useRunningLedger: boolean;
  private _container: Container | undefined;

  public get fullContainerImageName(): string {
    return [this.containerImageName, this.containerImageVersion].join(":");
  }

  public get className(): string {
    return "IndyTestLedger";
  }

  public get container(): Container {
    if (this._container) {
      return this._container;
    } else {
      throw new Error(`Invalid state: _container is not set. Called start()?`);
    }
  }

  constructor(public readonly options: IIndyTestLedgerOptions) {
    Checks.truthy(options, `${this.className} arg options`);

    this.logLevel =
      this.options.logLevel || INDY_TEST_LEDGER_DEFAULT_OPTIONS.logLevel;
    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: this.className,
    });

    this.emitContainerLogs =
      options?.emitContainerLogs ??
      INDY_TEST_LEDGER_DEFAULT_OPTIONS.emitContainerLogs;
    this.useRunningLedger =
      options?.useRunningLedger ??
      INDY_TEST_LEDGER_DEFAULT_OPTIONS.useRunningLedger;
    this.containerImageName =
      this.options.containerImageName ||
      INDY_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;
    this.containerImageVersion =
      this.options.containerImageVersion ||
      INDY_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.envVars =
      this.options.envVars || INDY_TEST_LEDGER_DEFAULT_OPTIONS.envVars;

    this.log.info(
      `Created ${this.className} OK. Image FQN: ${this.fullContainerImageName}`,
    );
  }

  /**
   * Get container status.
   *
   * @returns status string
   */
  public async getContainerStatus(): Promise<string> {
    if (!this.container) {
      throw new Error(
        "IndyTestLedger#getContainerStatus(): Container not started yet!",
      );
    }

    const { Status } = await Containers.getById(this.container.id);
    return Status;
  }

  /**
   * Start a test Indy ledger.
   *
   * @param omitPull Don't pull docker image from upstream if true.
   * @returns Promise<Container>
   */
  public async start(omitPull = false): Promise<Container> {
    if (this.useRunningLedger) {
      this.log.info(
        "Search for already running Indy Test Ledger because 'useRunningLedger' flag is enabled.",
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
      this._container = docker.getContainer(containerInfo.Id);
      return this._container;
    }

    if (this._container) {
      this.log.warn("Container was already running - restarting it...");
      await this.container.stop();
      await this.container.remove();
      this._container = undefined;
    }

    if (!omitPull) {
      await Containers.pullImage(
        this.fullContainerImageName,
        {},
        this.logLevel,
      );
    }

    return new Promise<Container>((resolve, reject) => {
      const docker = new Docker();
      const eventEmitter: EventEmitter = docker.run(
        this.fullContainerImageName,
        [],
        [],
        {
          ExposedPorts: {
            [`${DEFAULT_NODE1_PORT}/tcp`]: {},
            [`${DEFAULT_NODE1_CLIENT_PORT}/tcp`]: {},
            [`${DEFAULT_NODE2_PORT}/tcp`]: {},
            [`${DEFAULT_NODE2_CLIENT_PORT}/tcp`]: {},
            [`${DEFAULT_NODE3_PORT}/tcp`]: {},
            [`${DEFAULT_NODE3_CLIENT_PORT}/tcp`]: {},
            [`${DEFAULT_NODE4_PORT}/tcp`]: {},
            [`${DEFAULT_NODE4_CLIENT_PORT}/tcp`]: {},
          },
          Env: this.envVars,
          HostConfig: {
            PublishAllPorts: true,
          },
        },
        {},
        (err?: Error) => {
          if (err) {
            this.log.error(
              `Failed to start ${this.fullContainerImageName} container; `,
              err,
            );
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this._container = container;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.fullContainerImageName}]`;
          await Containers.streamLogs({
            container: this.container,
            tag: fnTag,
            log: this.log,
          });
        }

        try {
          await Containers.waitForHealthCheck(this.container.id);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  /**
   * Stop a test Indy ledger.
   *
   * @returns Stop operation results.
   */
  public async stop(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info("Ignore stop request because useRunningLedger is enabled.");
      return;
    } else if (this.container) {
      return Containers.stop(this.container);
    } else {
      throw new Error(
        `IndyTestLedger#stop() Container was never created, nothing to stop.`,
      );
    }
  }

  /**
   * Destroy a test Indy ledger.
   *
   * @returns Destroy operation results.
   */
  public async destroy(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info(
        "Ignore destroy request because useRunningLedger is enabled.",
      );
      return;
    } else if (this.container) {
      return this.container.remove();
    } else {
      throw new Error(
        `IndyTestLedger#destroy() Container was never created, nothing to destroy.`,
      );
    }
  }

  /**
   * Get localhost mapping of specified container port.
   *
   * @param port port in container
   * @returns localhost port
   */
  private async getHostPort(port: string): Promise<number> {
    const fnTag = `${this.className}#getHostPort()`;
    if (this.container) {
      const cInfo = await Containers.getById(this.container.id);
      return Containers.getPublicPort(parseInt(port, 10), cInfo);
    } else {
      throw new Error(`${fnTag} Container not set. Did you call start()?`);
    }
  }

  /**
   * Read ledger `pool_transactions_genesis` file from container storage.
   * Patch the node IP and ports to match the ones exported to the localhost matchine.
   *
   * @returns pool_transactions_genesis contents
   */
  public async readPoolTransactionsGenesis(): Promise<string> {
    if (!this.container) {
      throw new Error(
        "IndyTestLedger#readPoolTransactionsGenesis(): Container not started yet!",
      );
    }

    // Read pool_transactions_genesis file
    this.log.debug("Get client config from path:", GENESIS_FILE_PATH);
    let genesisFile = await Containers.pullFile(
      this.container,
      GENESIS_FILE_PATH,
      "ascii",
    );
    // this.log.debug("Raw pool_transactions_genesis file:", genesisFile);

    // Patch pool address
    const localhostIp = (await internalIpV4()) || "121.0.0.1";
    this.log.debug("localhost address found:", localhostIp);
    genesisFile = genesisFile.replace(
      new RegExp(DEFAULT_POOL_ADDRESS, "g"),
      localhostIp,
    );

    // Patch ports
    genesisFile = genesisFile
      .replace(
        DEFAULT_NODE1_PORT,
        (await this.getHostPort(DEFAULT_NODE1_PORT)).toString(),
      )
      .replace(
        DEFAULT_NODE1_CLIENT_PORT,
        (await this.getHostPort(DEFAULT_NODE1_CLIENT_PORT)).toString(),
      )
      .replace(
        DEFAULT_NODE2_PORT,
        (await this.getHostPort(DEFAULT_NODE2_PORT)).toString(),
      )
      .replace(
        DEFAULT_NODE2_CLIENT_PORT,
        (await this.getHostPort(DEFAULT_NODE2_CLIENT_PORT)).toString(),
      )
      .replace(
        DEFAULT_NODE3_PORT,
        (await this.getHostPort(DEFAULT_NODE3_PORT)).toString(),
      )
      .replace(
        DEFAULT_NODE3_CLIENT_PORT,
        (await this.getHostPort(DEFAULT_NODE3_CLIENT_PORT)).toString(),
      )
      .replace(
        DEFAULT_NODE4_PORT,
        (await this.getHostPort(DEFAULT_NODE4_PORT)).toString(),
      )
      .replace(
        DEFAULT_NODE4_CLIENT_PORT,
        (await this.getHostPort(DEFAULT_NODE4_CLIENT_PORT)).toString(),
      );
    this.log.debug("Patched pool_transactions_genesis file:", genesisFile);

    return genesisFile;
  }

  /**
   * Get indy VDR pool configuration object.
   *
   * @param indyNamespace namespace to use (default: `cacti:test`)
   * @returns `IndyVdrPoolConfig`
   */
  public async getIndyVdrPoolConfig(
    indyNamespace = DEFAULT_DID_INDY_NAMESPACE,
  ): Promise<IndyVdrPoolConfig> {
    const genesisTransactions = await this.readPoolTransactionsGenesis();
    return {
      isProduction: false,
      genesisTransactions,
      indyNamespace,
      connectOnStartup: true,
    };
  }

  /**
   * Get secret seed of already registered endorser did on indy ledger.
   * Can be imported into ledger and used to authenticate write operations on Indy VDR.
   *
   * @returns DID Seed
   */
  public getEndorserDidSeed(): string {
    return INDY_ENDORSER_DID_SEED;
  }
}
