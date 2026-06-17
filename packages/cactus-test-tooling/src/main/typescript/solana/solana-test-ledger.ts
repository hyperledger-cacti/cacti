import * as http from "http";
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

export interface ISolanaTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  /** Platform to pull/run the image as. The Agave image is `linux/amd64` only. */
  containerImagePlatform?: string;
  rpcApiHttpPort?: number;
  /** Extra flags appended to the `solana-test-validator` invocation. */
  commands?: string[];
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
}

/**
 * Defaults to the upstream Anza ("Agave") image, which ships
 * `solana-test-validator` on its PATH.
 *
 * Pinned to v2.1.x: Agave 3.x hard-requires `io_uring`, which is unavailable in
 * Docker's emulated-amd64 environment (e.g. on Apple Silicon) and makes the
 * validator panic at startup. v2.1.14 predates that requirement and runs fine
 * both natively (CI amd64) and under emulation. The image is `linux/amd64` only,
 * so the platform is pinned accordingly.
 */
export const SOLANA_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "v2.1.14",
  containerImageName: "docker.io/anzaxyz/agave",
  containerImagePlatform: "linux/amd64",
  rpcApiHttpPort: 8899,
});

export const SOLANA_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema =
  Joi.object().keys({
    containerImageVersion: Joi.string().min(1).required(),
    containerImageName: Joi.string().min(1).required(),
    rpcApiHttpPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
  });

/**
 * A {@link ITestLedger} that runs `solana-test-validator` inside a container so
 * integration tests get a throwaway localnet with a funded faucet (reachable via
 * the standard `requestAirdrop` RPC). Mirrors {@link BesuTestLedger}: pull image
 * -> run -> wait until the RPC reports healthy -> expose the mapped RPC URL.
 *
 * `solana-test-validator` creates its own genesis on startup, so (unlike geth)
 * the image needs no baked-in chain config — a plain Agave image is enough.
 */
export class SolanaTestLedger implements ITestLedger {
  public static readonly CLASS_NAME = "SolanaTestLedger";
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly containerImagePlatform: string;
  public readonly rpcApiHttpPort: number;
  public readonly commands: string[];
  public readonly emitContainerLogs: boolean;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: ISolanaTestLedgerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(
        `${SolanaTestLedger.CLASS_NAME}#constructor options was falsy.`,
      );
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      SOLANA_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      SOLANA_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;
    this.containerImagePlatform =
      options.containerImagePlatform ||
      SOLANA_TEST_LEDGER_DEFAULT_OPTIONS.containerImagePlatform;
    this.rpcApiHttpPort =
      options.rpcApiHttpPort ||
      SOLANA_TEST_LEDGER_DEFAULT_OPTIONS.rpcApiHttpPort;
    this.commands = options.commands || [];
    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this.validateConstructorOptions();
    const label = "solana-test-ledger";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = `${SolanaTestLedger.CLASS_NAME}#getContainer()`;
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    }
    return this.container;
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  /** The localnet JSON-RPC endpoint, mapped to a random host port. */
  public async getRpcApiHttpHost(): Promise<string> {
    const port = await this.getRpcApiPublicPort();
    return `http://127.0.0.1:${port}`;
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
      await Containers.pullImage(
        imageFqn,
        { platform: this.containerImagePlatform },
        this.options.logLevel,
      );
      this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);
    }

    // Override the image's default entrypoint (a full-cluster launcher) and run
    // `solana-test-validator` instead. `--bind-address 0.0.0.0` is required so
    // the RPC is reachable through the mapped host port (it binds to 127.0.0.1
    // inside the container otherwise).
    const entrypoint = [
      "solana-test-validator",
      "--reset",
      "--rpc-port",
      `${this.rpcApiHttpPort}`,
      "--bind-address",
      "0.0.0.0",
      "--ledger",
      "/tmp/test-ledger",
      ...this.commands,
    ];

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          platform: this.containerImagePlatform,
          Entrypoint: entrypoint,
          ExposedPorts: {
            [`${this.rpcApiHttpPort}/tcp`]: {},
          },
          HostConfig: {
            PublishAllPorts: true,
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
        this.log.debug(`Started container OK. Waiting for RPC readiness...`);
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
          await this.waitForRpcReady();
          this.log.debug(`Solana RPC reports healthy OK.`);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  /**
   * Poll the localnet RPC `getHealth` method until it reports "ok" (the validator
   * accepts connections before it is fully ready, so a plain TCP check is not
   * enough).
   */
  public async waitForRpcReady(timeoutMs = 180000): Promise<void> {
    const fnTag = `${SolanaTestLedger.CLASS_NAME}#waitForRpcReady()`;
    const host = await this.getRpcApiHttpHost();
    const startedAt = Date.now();
    for (; ;) {
      if (Date.now() >= startedAt + timeoutMs) {
        throw new Error(
          `${fnTag} timed out (${timeoutMs}ms) waiting for ${host}`,
        );
      }
      const health = await this.rpcGetHealth(host).catch(() => undefined);
      if (health === "ok") {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /** Single `getHealth` JSON-RPC probe; resolves the `result` string or rejects. */
  private rpcGetHealth(host: string): Promise<string> {
    const url = new URL(host);
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getHealth",
    });
    return new Promise<string>((resolve, reject) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: "/",
          method: "POST",
          timeout: 3000,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(body).result as string);
            } catch (ex) {
              reject(ex);
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => req.destroy(new Error("getHealth timed out")));
      req.write(payload);
      req.end();
    });
  }

  public stop(): Promise<unknown> {
    const fnTag = `${SolanaTestLedger.CLASS_NAME}#stop()`;
    if (this.container) {
      return this.container.stop();
    }
    return Promise.reject(new Error(`${fnTag} Container was not running.`));
  }

  public destroy(): Promise<unknown> {
    const fnTag = `${SolanaTestLedger.CLASS_NAME}#destroy()`;
    if (this.container) {
      return this.container.remove();
    }
    return Promise.reject(
      new Error(`${fnTag} Container not found, nothing to destroy.`),
    );
  }

  public async getRpcApiPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.rpcApiHttpPort, aContainerInfo);
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = `${SolanaTestLedger.CLASS_NAME}#getContainerInfo()`;
    const docker = new Docker();
    const containerInfos = await docker.listContainers({});
    const aContainerInfo = containerInfos.find(
      (ci) => ci.Id === this.containerId,
    );
    if (aContainerInfo) {
      return aContainerInfo;
    }
    throw new Error(`${fnTag} container not found: ${this.containerId}`);
  }

  private validateConstructorOptions(): void {
    const validationResult = SOLANA_TEST_LEDGER_OPTIONS_JOI_SCHEMA.validate({
      containerImageVersion: this.containerImageVersion,
      containerImageName: this.containerImageName,
      rpcApiHttpPort: this.rpcApiHttpPort,
    });

    if (validationResult.error) {
      throw new Error(
        `${SolanaTestLedger.CLASS_NAME}#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
