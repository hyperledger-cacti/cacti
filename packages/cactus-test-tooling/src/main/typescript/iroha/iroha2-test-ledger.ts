/**
 * Helper utils for setting up and starting Iroha V2 ledger for testing.
 */

import { EventEmitter } from "events";
import Docker, {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
} from "dockerode";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";

/**
 * Input options to Iroha2TestLedger constructor.
 */
export interface IIroha2TestLedgerOptions {
  readonly containerImageName?: string;
  readonly containerImageVersion?: string;
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: string[];
  // For test development, attach to ledger that is already running, don't spin up new one
  readonly useRunningLedger?: boolean;
}

/**
 * Default values used by Iroha2TestLedger constructor.
 */
export const IROHA2_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageName: "ghcr.io/hyperledger/cactus-iroha2-all-in-one",
  containerImageVersion: "2023-07-29-f2bc772ee",
  logLevel: "info" as LogLevelDesc,
  emitContainerLogs: true,
  envVars: [],
  useRunningLedger: false,
});

/**
 * Iroha V2 configuration used by `iroha_client_cli` tool.
 * Contains all the necessary data needed to connect to the Iroha ledger.
 */
export type Iroha2ClientConfig = {
  PUBLIC_KEY: string;
  PRIVATE_KEY: {
    digest_function: string;
    payload: string;
  };
  ACCOUNT_ID: string;
  BASIC_AUTH: {
    web_login: string;
    password: string;
  };
  TORII_API_URL: string;
  TORII_TELEMETRY_URL: string;
  TRANSACTION_TIME_TO_LIVE_MS: number;
  TRANSACTION_STATUS_TIMEOUT_MS: number;
  TRANSACTION_LIMITS: {
    max_instruction_number: number;
    max_wasm_size_bytes: number;
  };
  ADD_TRANSACTION_NONCE: boolean;
};

/**
 * Class for running a test Iroha V2 ledger in a container.
 */
export class Iroha2TestLedger implements ITestLedger {
  public readonly containerImageName: string;
  public readonly containerImageVersion: string;
  public readonly logLevel: LogLevelDesc;
  public readonly emitContainerLogs: boolean;
  public readonly envVars: string[];
  public readonly useRunningLedger: boolean;
  public container: Container | undefined;

  private readonly log: Logger;

  constructor(options?: IIroha2TestLedgerOptions) {
    // Parse input options
    this.containerImageName =
      options?.containerImageName ??
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;

    this.containerImageVersion =
      options?.containerImageVersion ??
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;

    this.logLevel =
      options?.logLevel ?? IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.logLevel;

    this.emitContainerLogs =
      options?.emitContainerLogs ??
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.emitContainerLogs;

    this.envVars =
      options?.envVars ?? IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.envVars;

    this.useRunningLedger =
      options?.useRunningLedger ??
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.useRunningLedger;

    // Instantiate logger
    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: "iroha2-test-ledger",
    });
  }

  /**
   * Full container name with a version tag
   */
  public get fullContainerImageName(): string {
    return [this.containerImageName, this.containerImageVersion].join(":");
  }

  /**
   * Start a test Iroha V2 ledger.
   *
   * @param omitPull Don't pull docker image from upstream if true.
   * @returns Promise<Container>
   */
  public async start(omitPull = false): Promise<Container> {
    if (this.useRunningLedger) {
      this.log.info(
        "Search for already running Iroha V2 Test Ledger because 'useRunningLedger' flag is enabled.",
      );
      this.log.info(
        "Search criteria - image name: ",
        this.fullContainerImageName,
        ", state: running",
      );
      const containerInfo = await Containers.getByPredicate(
        (ci) =>
          ci.Image === this.fullContainerImageName && ci.State === "healthy",
      );
      const docker = new Docker();
      this.container = docker.getContainer(containerInfo.Id);
      return this.container;
    }

    if (this.container) {
      this.log.warn("Container was already running - restarting it...");
      await this.container.stop();
      await this.container.remove();
      this.container = undefined;
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
        "8080/tcp": {}, // Peer0 API
        "8180/tcp": {}, // Peer0 Telemetry
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
        (err: unknown) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.fullContainerImageName}]`;
          await Containers.streamLogs({
            container: this.container,
            tag: fnTag,
            log: this.log,
          });
        }

        try {
          await Containers.waitForHealthCheck(container.id);
          resolve(container);
        } catch (ex) {
          this.log.error(ex);
          reject(ex);
        }
      });
    });
  }

  /**
   * Get container status.
   *
   * @returns status string
   */
  public async getContainerStatus(): Promise<string> {
    if (!this.container) {
      throw new Error(
        "Iroha2TestLedger#getContainerStatus(): Container not started yet!",
      );
    }

    const { Status } = await Containers.getById(this.container.id);
    return Status;
  }

  /**
   * Stop a test Iroha V2 ledger.
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
        `Iroha2TestLedger#stop() Container was never created, nothing to stop.`,
      );
    }
  }

  /**
   * Destroy a test Iroha V2 ledger.
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
        `Iroha2TestLedger#destroy() Container was never created, nothing to destroy.`,
      );
    }
  }

  /**
   * Get this container info (output from dockerode listContainers method).
   *
   * @returns ContainerInfo
   */
  protected async getContainerInfo(): Promise<ContainerInfo> {
    if (!this.container) {
      throw new Error(
        "Iroha2TestLedger#getContainerInfo(): Container not started yet!",
      );
    }

    const containerInfos = await new Docker().listContainers({});
    const containerId = this.container.id;
    const thisContainerInfo = containerInfos.find(
      (ci) => ci.Id === containerId,
    );

    if (thisContainerInfo) {
      return thisContainerInfo;
    } else {
      throw new Error(
        "Iroha2TestLedger#getContainerInfo() could not find container info.",
      );
    }
  }

  /**
   * Change the port in URL from original to the one that was exported by docker
   * (i.e. the one that is available in `127.0.0.1` running this container, not inside the container).
   *
   * @param url some URL ending with a port (e.g. `http://127.0.0.1:8080`)
   * @param containerInfo dockerode container info.
   * @returns patched URL string.
   */
  protected async patchDockerPortInURL(
    url: string,
    containerInfo: ContainerInfo,
  ): Promise<string> {
    this.log.debug("URL before adjustment:", url);

    const origPort = url.substring(url.lastIndexOf(":") + 1);
    const localhostPort = await Containers.getPublicPort(
      parseInt(origPort, 10),
      containerInfo,
    );

    const newUrl = url.replace(origPort, localhostPort.toString());
    this.log.debug("URL after adjustment:", newUrl);

    return newUrl;
  }

  /**
   * Read client config file from the container. Adjust the ports in URL so that the endpoints
   * can be used from 127.0.0.1.
   *
   * @returns parsed `Iroha2ClientConfig`
   */
  public async getClientConfig(): Promise<Iroha2ClientConfig> {
    if (!this.container) {
      throw new Error(
        "Iroha2TestLedger#getClientConfig(): Container not started yet!",
      );
    }

    // Get App root
    const envVars = await Containers.getEnvVars(this.container);
    const appRootDir = envVars.get("APP_ROOT") ?? "/app";

    // Read config file
    const configPath = `${appRootDir}/configs/client_cli/config.json`;
    this.log.debug("Get client config from path:", configPath);
    const configFile = await Containers.pullFile(
      this.container,
      configPath,
      "ascii",
    );
    this.log.debug("Raw config file:", configFile);

    // Parse file
    const configObj = JSON.parse(configFile) as Iroha2ClientConfig;

    // Patch ports
    const containerInfo = await this.getContainerInfo();
    configObj.TORII_API_URL = await this.patchDockerPortInURL(
      configObj.TORII_API_URL,
      containerInfo,
    );
    configObj.TORII_TELEMETRY_URL = await this.patchDockerPortInURL(
      configObj.TORII_TELEMETRY_URL,
      containerInfo,
    );

    return configObj;
  }

  /**
   * Execute `iroha_client_cli` on the ledger.
   *
   * @param cmd Array of `iroha_client_cli` arguments.
   * @param timeout Command timeout.
   * @returns Output of the command.
   * @note The output will contain some additional output (like fetching the cli image), not only the command response.
   */
  public async runIrohaClientCli(
    cmd: string[],
    timeout = 60 * 1000,
  ): Promise<string> {
    if (!this.container) {
      throw new Error(
        "Iroha2TestLedger#runIrohaClientCli(): Container not started yet!",
      );
    }

    // Pass the command to shell helper script in the container
    cmd.unshift("iroha_client_cli");

    this.log.debug("Run shell command:", cmd);
    return Containers.exec(this.container, cmd, timeout, this.logLevel);
  }
}
