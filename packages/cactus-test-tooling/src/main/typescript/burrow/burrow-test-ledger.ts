//import { v4 as uuidv4 } from "uuid";
import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
//import Web3 from "web3";
//import { Account } from "web3-core";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";

export interface IBurrowTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  grpcPort?: number;
  peerPort?: number;
  infoPort?: number;
  //rpcApiHttpPort?: number;
  envVars?: string[];
  logLevel?: LogLevelDesc;
}

export const BURROW_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "0.32.1",
  containerImageName: "hyperledger/burrow",
  grpcPort: 10997,
  peerPort: 26656,
  infoPort: 26658,
  envVars: [],
});

export const BURROW_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    containerImageVersion: Joi.string().min(5).required(),
    containerImageName: Joi.string().min(1).required(),
    grpcPort: Joi.number().integer().positive().min(1024).max(65535).required(),
    peerPort: Joi.number().integer().positive().min(1024).max(65535).required(),
    infoPort: Joi.number().integer().positive().min(1024).max(65535).required(),
    envVars: Joi.array().allow(null).required(),
  },
);

export class BurrowTestLedger implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly grpcPort: number;
  public readonly peerPort: number;
  public readonly infoPort: number;
  //public readonly rpcApiHttpPort: number;
  public readonly envVars: string[];

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: IBurrowTestLedgerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(`BurrowTestLedger#ctor options was falsy.`);
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      BURROW_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      BURROW_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;

    this.grpcPort =
      options.grpcPort || BURROW_TEST_LEDGER_DEFAULT_OPTIONS.grpcPort;
    this.peerPort =
      options.peerPort || BURROW_TEST_LEDGER_DEFAULT_OPTIONS.peerPort;
    this.infoPort =
      options.infoPort || BURROW_TEST_LEDGER_DEFAULT_OPTIONS.infoPort;

    this.envVars =
      options.envVars || BURROW_TEST_LEDGER_DEFAULT_OPTIONS.envVars;

    this.validateConstructorOptions();
    const label = "burrow-test-ledger";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "BurrowTestLedger#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getGrpcHttpHost(): Promise<string> {
    const ipAddress = "0.0.0.0";
    const hostPort: number = await this.getGrpcPublicPort();
    return `http://${ipAddress}:${hostPort}`;
  }
  public async getPeerHttpHost(): Promise<string> {
    const ipAddress = "0.0.0.0";
    const hostPort: number = await this.getPeerPublicPort();
    return `http://${ipAddress}:${hostPort}`;
  }
  public async getInfoHttpHost(): Promise<string> {
    const ipAddress = "0.0.0.0";
    const hostPort: number = await this.getInfoPublicPort();
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

  //from /home/burrow/keys/data
  public getGenesisAccounts(): string {
    return "545D5025216A47B37F4C611BD0494F4025704331";
  }

  public getGenesisAccountPubKeys(): string {
    return "49BDE104BD224137D39FE8CE7BB1DCEF7F72A9387CDEC9E3749597B234032730";
  }

  public getGenesisAccountPrivKey(): string {
    return "FD003063B619409634B7EACD5A354A9C239522E0A7E182C866E25CB0F3FB6FAB49BDE104BD224137D39FE8CE7BB1DCEF7F72A9387CDEC9E3749597B234032730";
  }

  public async start(): Promise<Container> {
    const imageFqn = this.getContainerImageName();
    this.log.error(imageFqn);
    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    this.log.debug(`Pulling container image ${imageFqn} ...`);
    await this.pullContainerImage(imageFqn);
    this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            [`${this.grpcPort}/tcp`]: {}, // burrow RPC - HTTP
            "26656/tcp": {},
            "26658/tcp": {},
          },
          // This is a workaround needed for macOS which has issues with routing
          // to docker container's IP addresses directly...
          // https://stackoverflow.com/a/39217691
          PublishAllPorts: true,
          Healthcheck: {
            Test: [
              "CMD-SHELL",
              // `curl -X POST --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' localhost:26660`,
              `wget -O- --post-data='{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' --header='Content-Type:application/json' 'http://localhost:26660/'`,
            ],
            Interval: 1000000000, // 1 second
            Timeout: 3000000000, // 3 seconds
            Retries: 299,
            StartPeriod: 3000000000, // 1 second
          },
          //Env: this.envVars,
        },
        {},
        (err: Error) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        const imageFqn1 = this.getContainerImageName();
        this.log.error(imageFqn1);
        this.log.error("starting container");
        this.log.debug(`Started container OK. Waiting for healthcheck...`);
        this.container = container;
        this.containerId = container.id;
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

  public async waitForHealthCheck(timeoutMs = 180000): Promise<void> {
    const fnTag = "BesuTestLedger#waitForHealthCheck()";
    const startedAt = Date.now();
    let isHealthy = false;
    do {
      if (Date.now() >= startedAt + timeoutMs) {
        throw new Error(`${fnTag} timed out (${timeoutMs}ms)`);
      }
      const containerInfo = await this.getContainerInfo();
      this.log.debug(`ContainerInfo.Status=%o`, containerInfo.Status);
      this.log.debug(`ContainerInfo.State=%o`, containerInfo.State);
      isHealthy = containerInfo.Status.endsWith("(healthy)");
      if (!isHealthy) {
        await new Promise((resolve2) => setTimeout(resolve2, 1000));
      }
    } while (!isHealthy);
  }

  public stop(): Promise<unknown> {
    const fnTag = "BurrowTestLedger#stop()";
    return new Promise((resolve, reject) => {
      if (this.container) {
        this.container.stop({}, (err: Error, result: unknown) => {
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
    const fnTag = "BurrowTestLedger#destroy()";
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
      throw new Error(
        `BurrowTestLedger#getContainerInfo() no image "${image}"`,
      );
    }
  }

  public async getGrpcPublicPort(): Promise<number> {
    return this.getPublicPort(this.grpcPort);
  }
  public async getPeerPublicPort(): Promise<number> {
    return this.getPublicPort(this.grpcPort);
  }
  public async getInfoPublicPort(): Promise<number> {
    return this.getPublicPort(this.grpcPort);
  }
  public async getPublicPort(thePort: number): Promise<number> {
    const fnTag = "BurrowTestLedger#getPublicPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { Ports: ports } = aContainerInfo;

    if (ports.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = ports.find((x) => x.PrivatePort === thePort);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${thePort} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${thePort} mapped to localhost`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${thePort}`);
    }
  }
  public async getContainerIpAddress(): Promise<string> {
    const fnTag = "BurrowTestLedger#getContainerIpAddress()";
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
      throw new Error(`${fnTag} cannot find image: ${this.containerImageName}`);
    }
  }

  private pullContainerImage(containerNameAndTag: string): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const docker = new Docker();
      docker.pull(containerNameAndTag, (pullError: Error, stream: unknown) => {
        if (pullError) {
          reject(pullError);
        } else {
          docker.modem.followProgress(
            stream,
            (progressError: Error, output: unknown[]) => {
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
    const validationResult = Joi.validate<IBurrowTestLedgerConstructorOptions>(
      {
        containerImageVersion: this.containerImageVersion,
        containerImageName: this.containerImageName,
        grpcPort: this.grpcPort,
        peerPort: this.peerPort,
        infoPort: this.infoPort,
        envVars: this.envVars,
      },
      BURROW_TEST_LEDGER_OPTIONS_JOI_SCHEMA,
    );

    if (validationResult.error) {
      throw new Error(
        `BurrowTestLedger#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
