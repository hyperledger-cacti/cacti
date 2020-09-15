import Docker, { Container, ContainerInfo } from "dockerode";
import axios from "axios";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";
import { IKeyPair } from "../i-key-pair";

export interface IBesuTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  rpcApiHttpPort?: number;
  envVars?: string[];
}

export const BESU_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "latest",
  containerImageName: "hyperledger/cactus-besu-all-in-one",
  rpcApiHttpPort: 8545,
  envVars: ["BESU_NETWORK=dev"],
});

export const BESU_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    containerImageVersion: Joi.string().min(5).required(),
    containerImageName: Joi.string().min(1).required(),
    rpcApiHttpPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
    envVars: Joi.array().allow(null).required(),
  }
);

export class BesuTestLedger implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly rpcApiHttpPort: number;
  public readonly envVars: string[];

  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly options: IBesuTestLedgerConstructorOptions = {}) {
    if (!options) {
      throw new TypeError(`BesuTestLedger#ctor options was falsy.`);
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      BESU_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      BESU_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;
    this.rpcApiHttpPort =
      options.rpcApiHttpPort || BESU_TEST_LEDGER_DEFAULT_OPTIONS.rpcApiHttpPort;
    this.envVars = options.envVars || BESU_TEST_LEDGER_DEFAULT_OPTIONS.envVars;

    this.validateConstructorOptions();
  }

  public getContainer(): Container {
    const fnTag = "BesuTestLedger#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getRpcApiHttpHost(): Promise<string> {
    const ipAddress: string = "127.0.0.1";
    const hostPort: number = await this.getRpcApiPublicPort();
    return `http://${ipAddress}:${hostPort}`;
  }

  public async getFileContents(filePath: string): Promise<string> {
    const response: any = await this.getContainer().getArchive({
      path: filePath,
    });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents: string = "";
      extract.on("entry", async (header: any, stream, next) => {
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

  public async getBesuKeyPair(): Promise<IKeyPair> {
    const publicKey = await this.getFileContents("/opt/besu/keys/key.pub");
    const privateKey = await this.getFileContents("/opt/besu/keys/key");
    return { publicKey, privateKey };
  }

  public async getOrionKeyPair(): Promise<IKeyPair> {
    const publicKey = await this.getFileContents("/config/orion/nodeKey.pub");
    const privateKey = await this.getFileContents("/config/orion/nodeKey.key");
    return { publicKey, privateKey };
  }

  public async start(): Promise<Container> {
    const containerNameAndTag = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    await this.pullContainerImage(containerNameAndTag);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        containerNameAndTag,
        [],
        [],
        {
          ExposedPorts: {
            [`${this.rpcApiHttpPort}/tcp`]: {}, // besu RPC - HTTP
            "8546/tcp": {}, // besu RPC - WebSocket
            "8888/tcp": {}, // orion Client Port - HTTP
            "8080/tcp": {}, // orion Node Port - HTTP
            "9001/tcp": {}, // supervisord - HTTP
            "9545/tcp": {}, // besu metrics
          },
          // This is a workaround needed for macOS which has issues with routing
          // to docker container's IP addresses directly...
          // https://stackoverflow.com/a/39217691
          PublishAllPorts: true,
          Env: this.envVars,
        },
        {},
        (err: any) => {
          if (err) {
            reject(err);
          }
        }
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;
        try {
          await this.waitForHealthCheck();
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs: number = 120000): Promise<void> {
    const fnTag = "BesuTestLedger#waitForHealthCheck()";
    const httpUrl = await this.getRpcApiHttpHost();
    const startedAt = Date.now();
    let reachable: boolean = false;
    do {
      try {
        const res = await axios.get(httpUrl);
        reachable = res.status > 199 && res.status < 300;
      } catch (ex) {
        reachable = false;
        if (Date.now() >= startedAt + timeoutMs) {
          throw new Error(`${fnTag} timed out (${timeoutMs}ms) -> ${ex.stack}`);
        }
      }
      await new Promise((resolve2) => setTimeout(resolve2, 100));
    } while (!reachable);
  }

  public stop(): Promise<any> {
    const fnTag = "BesuTestLedger#stop()";
    return new Promise((resolve, reject) => {
      if (this.container) {
        this.container.stop({}, (err: any, result: any) => {
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

  public destroy(): Promise<any> {
    const fnTag = "BesuTestLedger#destroy()";
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
      throw new Error(`BesuTestLedger#getContainerInfo() no image "${image}"`);
    }
  }

  public async getRpcApiPublicPort(): Promise<number> {
    const fnTag = "BesuTestLedger#getRpcApiPublicPort()";
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
        throw new Error(`${fnTag} port ${thePort} mapped to localhost`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${thePort}`);
    }
  }

  public async getContainerIpAddress(): Promise<string> {
    const fnTag = "BesuTestLedger#getContainerIpAddress()";
    const aContainerInfo = await this.getContainerInfo();

    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(`${fnTag} container not connected to any networks`);
      } else {
        // return IP address of container on the first network that we found
        // it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(`${fnTag} cannot find image: ${this.containerImageName}`);
    }
  }

  private pullContainerImage(containerNameAndTag: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const docker = new Docker();
      docker.pull(containerNameAndTag, (pullError: any, stream: any) => {
        if (pullError) {
          reject(pullError);
        } else {
          docker.modem.followProgress(
            stream,
            (progressError: any, output: any[]) => {
              if (progressError) {
                reject(progressError);
              } else {
                resolve(output);
              }
            },
            (event: any) => null // ignore the spammy docker download log, we get it in the output variable anyway
          );
        }
      });
    });
  }

  private validateConstructorOptions(): void {
    const validationResult = Joi.validate<IBesuTestLedgerConstructorOptions>(
      {
        containerImageVersion: this.containerImageVersion,
        containerImageName: this.containerImageName,
        rpcApiHttpPort: this.rpcApiHttpPort,
        envVars: this.envVars,
      },
      BESU_TEST_LEDGER_OPTIONS_JOI_SCHEMA
    );

    if (validationResult.error) {
      throw new Error(
        `BesuTestLedger#ctor ${validationResult.error.annotate()}`
      );
    }
  }
}
