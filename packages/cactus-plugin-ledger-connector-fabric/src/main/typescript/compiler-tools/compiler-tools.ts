import {
  Bools,
  ILoggerOptions,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger-cacti/cactus-common";
import Joi from "joi";
import Docker, { Container, ContainerInfo } from "dockerode";
import Dockerode from "dockerode";
import EventEmitter from "events";
import { SSHExecCommandResponse } from "node-ssh";
import { streamLogs } from "./containers";
import pRetry from "p-retry";
import throttle from "lodash/throttle";

export const CC_COMPILER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "2025-08-12-d5365bf",
  containerImageName: "ghcr.io/hyperledger-cacti/cactus-connector-fabric-cli",
  dockerNetworkName: "bridge",
});

export interface IDockerPullProgressDetail {
  readonly current: number;
  readonly total: number;
}

export interface IDockerPullProgress {
  readonly status: "Downloading";
  readonly progressDetail: IDockerPullProgressDetail;
  readonly progress: string;
  readonly id: string;
}

export interface ICompilerToolsOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  emitContainerLogs?: boolean;
  logLevel?: LogLevelDesc;
  dockerNetworkName?: string;
}

export const CC_COMPILER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object({
  containerImageVersion: Joi.string().min(5).required(),
  containerImageName: Joi.string().min(1).required(),
});

export interface IExecuteCommandOptions {
  command: string[];
  env?: string[];
  label?: string;
  workingDir?: string;
}

export class CompilerTools {
  public static readonly CLASS_NAME = "CompilerTools";
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly emitContainerLogs: boolean;

  private readonly log: Logger;
  private readonly level: LogLevelDesc;
  private container: Container | undefined;
  private containerId: string | undefined;

  private dockerNetworkName: string =
    CC_COMPILER_DEFAULT_OPTIONS.dockerNetworkName;

  constructor(options: ICompilerToolsOptions = {}) {
    if (!options) {
      throw new TypeError(
        `${CompilerTools.CLASS_NAME}#constructor options was falsy.`,
      );
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      CC_COMPILER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      CC_COMPILER_DEFAULT_OPTIONS.containerImageName;

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    if (options.dockerNetworkName) {
      this.dockerNetworkName = options.dockerNetworkName;
    }

    const label = "fabric-cc-compiler";
    this.level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level: this.level, label });
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public getContainer(): Container {
    const fnTag = `${CompilerTools.CLASS_NAME}#getContainer()`;
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public async waitForHealthCheck(timeoutMs = 360000): Promise<void> {
    const fnTag = `${CompilerTools.CLASS_NAME}#waitForHealthCheck()`;
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
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`BesuTestLedger#getContainerInfo() no image "${image}"`);
    }
  }

  public stop(): Promise<unknown> {
    const fnTag = "BesuTestLedger#stop()";
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
    const fnTag = "BesuTestLedger#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
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
      await CompilerTools.pullImage(imageFqn, undefined, this.level);
      this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);
    }

    if (!this.dockerNetworkName) {
      throw new Error(
        `${CompilerTools.CLASS_NAME}#start() dockerNetworkName is required.`,
      );
    }

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            "22/tcp": {}, // OpenSSH Server - TCP
          },
          HostConfig: {
            NetworkMode: this.dockerNetworkName,
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
        this.log.debug(`Started container OK. Waiting for healthcheck...`);
        this.container = container;
        this.containerId = container.id;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.getContainerImageName()}]`;
          await streamLogs({
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

  public async executeCommand(
    options: IExecuteCommandOptions,
  ): Promise<SSHExecCommandResponse> {
    const fnTag = `${CompilerTools.CLASS_NAME}#executeCommand`;
    if (!options || !options.command) {
      throw new Error(`${fnTag}: options.command is required.`);
    }

    if (!this.container) {
      throw new Error(`${fnTag}: Container not started yet.`);
    }

    if (!Array.isArray(options.command) || options.command.length === 0) {
      throw new Error(`${fnTag}: Command must be a non-empty array.`);
    }

    if (options.env && !Array.isArray(options.env)) {
      throw new Error(`${fnTag}: env must be an array of strings.`);
    }

    this.log.debug(
      `${fnTag}: ${options.label}: Executing command "${options.command.join(" ")}" in container ${this.container.id}` +
        (options.workingDir ? ` (cwd: ${options.workingDir})` : "") +
        (options.env && options.env.length > 0
          ? ` (env: ${options.env.join(", ")})`
          : ""),
    );

    const exec = await this.container.exec({
      Cmd: options.command,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: options.workingDir,
      Env: options.env || [],
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => {
        const header = chunk.readUInt8(0);
        const content = chunk.slice(8); // skip Docker's 8-byte multiplexing header

        if (header === 1) {
          stdoutChunks.push(content);
        } else if (header === 2) {
          stderrChunks.push(content);
        }
      });

      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const inspect = await exec.inspect();
    const stdout = Buffer.concat(stdoutChunks).toString().trim();
    const stderr = Buffer.concat(stderrChunks).toString().trim();

    if (inspect.ExitCode === 0) {
      this.log.debug(`${fnTag}: Command succeeded.`);
    } else {
      this.log.error(
        `${fnTag}: Command failed with exit code ${inspect.ExitCode}`,
      );
      throw new Error(
        `${fnTag}: Command failed with exit code ${inspect.ExitCode}.` +
          (stderr ? ` stderr: ${stderr}` : "") +
          (stdout ? ` stdout: ${stdout}` : ""),
      );
    }

    return {
      stdout,
      stderr,
      code: inspect.ExitCode ?? null,
      signal: null,
    };
  }

  public static pullImage(
    imageFqn: string,
    options: Record<string, unknown> = {},
    logLevel?: LogLevelDesc,
  ): Promise<unknown[]> {
    const defaultLoggerOptions: ILoggerOptions = {
      label: "containers#pullImage()",
      level: logLevel || "INFO",
    };
    const log = LoggerProvider.getOrCreate(defaultLoggerOptions);
    const task = () => CompilerTools.tryPullImage(imageFqn, options, logLevel);
    const retryOptions: pRetry.Options & { retries: number } = {
      retries: 6,
      onFailedAttempt: async (ex) => {
        log.debug(`Failed attempt at pulling container image ${imageFqn}`, ex);
      },
    };
    return pRetry(task, retryOptions);
  }

  public static tryPullImage(
    imageFqn: string,
    options: Record<string, unknown> = {},
    logLevel?: LogLevelDesc,
  ): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const loggerOptions: ILoggerOptions = {
        label: "containers#tryPullImage()",
        level: logLevel || "INFO",
      };
      const log = LoggerProvider.getOrCreate(loggerOptions);

      const docker = new Dockerode();

      const progressPrinter = throttle((msg: IDockerPullProgress): void => {
        log.debug(JSON.stringify(msg.progress || msg.status));
      }, 1000);

      const pullStreamStartedHandler = (
        pullError: unknown,
        stream: NodeJS.ReadableStream,
      ) => {
        if (pullError) {
          log.error(`Could not even start ${imageFqn} pull:`, pullError);
          reject(pullError);
        } else {
          log.debug(`Started ${imageFqn} pull progress stream OK`);
          docker.modem.followProgress(
            stream,
            (progressError: unknown, output: unknown[]) => {
              if (progressError) {
                log.error(`Failed to finish ${imageFqn} pull:`, progressError);
                reject(progressError);
              } else {
                log.debug(`Finished ${imageFqn} pull completely OK`);
                resolve(output);
              }
            },
            (msg: IDockerPullProgress): void => progressPrinter(msg),
          );
        }
      };

      docker.pull(imageFqn, options, pullStreamStartedHandler);
    });
  }
}
