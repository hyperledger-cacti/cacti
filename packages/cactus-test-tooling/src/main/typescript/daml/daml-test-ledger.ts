import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";
import { Containers } from "../common/containers";

export interface IDamlTestLedgerOptions {
  imageVersion?: string;
  imageName?: string;
  rpcApiHttpPort?: number;
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
}

const DEFAULTS = Object.freeze({
  imageVersion: "2024-09-08T07-40-07-dev-2cc217b7a",
  imageName: "ghcr.io/hyperledger/cacti-daml-all-in-one",
  rpcApiHttpPort: 7575,
});

export const DAML_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULTS;

export const DAML_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema =
  Joi.object().keys({
    imageVersion: Joi.string().min(5).required(),
    imageName: Joi.string().min(1).required(),
    rpcApiHttpPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
  });

export class DamlTestLedger implements ITestLedger {
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly rpcApiHttpPort: number;
  public readonly emitContainerLogs: boolean;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly opts?: IDamlTestLedgerOptions) {
    if (!opts) {
      throw new TypeError(`DAMLTestLedger#ctor options was falsy.`);
    }
    this.imageVersion = opts.imageVersion || DEFAULTS.imageVersion;
    this.imageName = opts.imageName || DEFAULTS.imageName;
    this.rpcApiHttpPort = opts.rpcApiHttpPort || DEFAULTS.rpcApiHttpPort;

    this.emitContainerLogs = Bools.isBooleanStrict(opts.emitContainerLogs)
      ? (opts.emitContainerLogs as boolean)
      : true;

    this.validateConstructorOptions();
    const label = "daml-test-ledger";
    const level = opts.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "DAMLTestLedger#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public async getRpcApiHttpHost(): Promise<string> {
    const ipAddress = "127.0.0.1";
    const hostPort: number = await this.getRpcApiPublicPort();
    return `http://${ipAddress}:${hostPort}`;
  }

  public async getFileContents(filePath: string): Promise<string> {
    const response = await this.getContainer().getArchive({
      path: filePath,
    });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents = "";
      extract.on("entry", async (header: unknown, stream, next) => {
        stream.on("error", (err: Error) => {
          reject(err);
        });
        const chunks: string[] = await Streams.aggregate<string>(stream);
        fileContents += chunks.join("");
        stream.resume();
        next();
      });

      extract.on("finish", () => {
        resolve(fileContents);
      });

      response.pipe(extract);
    });
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
      await this.pullContainerImage(imageFqn);
      this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);
    }

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          NetworkMode: "host",
          ExposedPorts: {
            "7575/tcp": {}, // DAML http endpoint
          },
          HostConfig: {
            PublishAllPorts: true,
            PortBindings: {
              "7575/tcp": [
                {
                  HostPort: "7575", //change the default port of docker back to 7575
                },
              ],
            },
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

  public async waitForHealthCheck(timeoutMs = 360000): Promise<void> {
    const fnTag = "DAMLTestLedger#waitForHealthCheck()";
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

  public stop(): Promise<unknown> {
    const fnTag = "DAMLTestLedger#stop()";
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
    const fnTag = "DAMLTestLedger#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
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
      throw new Error(`DAMLTestLedger#getContainerInfo() no image "${image}"`);
    }
  }

  public async getRpcApiPublicPort(): Promise<number> {
    const fnTag = "DAMLTestLedger#getRpcApiPublicPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { rpcApiHttpPort: thePort } = this;
    const { Ports: ports } = aContainerInfo;

    if (ports.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = ports.find((x) => x.PrivatePort === thePort);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${thePort} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${thePort} mapped to 127.0.0.1`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${thePort}`);
    }
  }
  public async getDamlAuthorizationToken(): Promise<string> {
    const docker = new Docker();
    const aContainerInfo = await this.getContainerInfo();
    const containerId = aContainerInfo.Id;
    const exec = await docker.getContainer(containerId).exec({
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ["/bin/bash", "-c", "cat jwt"], // Command to execute
    });
    const stream = await exec.start({});

    return new Promise<string>((resolve, reject) => {
      let output = "";
      stream.on("data", (data: Buffer) => {
        output += data.toString(); // Accumulate the output
        resolve(output);
      });
      stream.on("error", (err: Error) => {
        reject(err);
      });
    });
  }

  public async getContainerIpAddress(): Promise<string> {
    const fnTag = "DAMLTestLedger#getContainerIpAddress()";
    const aContainerInfo = await this.getContainerInfo();

    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(`${fnTag} container not connected to any networks`);
      } else {
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(`${fnTag} cannot find image: ${this.imageName}`);
    }
  }

  private pullContainerImage(containerNameAndTag: string): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const docker = new Docker();
      docker.pull(containerNameAndTag, (pullError: unknown, stream: never) => {
        if (pullError) {
          reject(pullError);
        } else {
          docker.modem.followProgress(
            stream,
            (progressError: unknown, output: unknown[]) => {
              if (progressError) {
                reject(progressError);
              } else {
                resolve(output);
              }
            },
          );
        }
      });
    });
  }

  private validateConstructorOptions(): void {
    const validationResult = DAML_TEST_LEDGER_OPTIONS_JOI_SCHEMA.validate({
      imageVersion: this.imageVersion,
      imageName: this.imageName,
      rpcApiHttpPort: this.rpcApiHttpPort,
    });

    if (validationResult.error) {
      throw new Error(
        `DAMLTestLedger#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
