import Docker, { Container, ContainerInfo } from "dockerode";
import axios from "axios";
import Joi from "joi";
import { EventEmitter } from "events";
import { ITestLedger } from "../i-test-ledger";

/*
 * Contains options for Fabric container
 */
export interface IFabricTestLedgerV1ConstructorOptions {
  imageVersion?: string;
  imageName?: string;
  opsApiHttpPort?: number;
}

/*
 * Provides default options for Fabric container
 */
const DEFAULT_OPTS = Object.freeze({
  imageVersion: "latest",
  imageName: "hyperledger/cactus-fabric-all-in-one",
  opsApiHttpPort: 9443,
});
export const FABRIC_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULT_OPTS;

/*
 * Provides validations for the Fabric container's options
 */
const OPTS_JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string().min(1).required(),
  opsApiHttpPort: Joi.number().integer().min(1024).max(65535).required(),
});

export const FABRIC_TEST_LEDGER_OPTIONS_JOI_SCHEMA = OPTS_JOI_SCHEMA;

export class FabricTestLedgerV1 implements ITestLedger {
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly opsApiHttpPort: number;

  private container: Container | undefined;

  constructor(
    public readonly options: IFabricTestLedgerV1ConstructorOptions = {}
  ) {
    if (!options) {
      throw new TypeError(`FabricTestLedgerV1#ctor options was falsy.`);
    }
    this.imageVersion = options.imageVersion || DEFAULT_OPTS.imageVersion;
    this.imageName = options.imageName || DEFAULT_OPTS.imageName;
    this.opsApiHttpPort = options.opsApiHttpPort || DEFAULT_OPTS.opsApiHttpPort;

    this.validateConstructorOptions();
  }

  public getContainer(): Container {
    const fnTag = "FabricTestLedgerV1#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public async getOpsApiHttpHost(): Promise<string> {
    const ipAddress: string = "127.0.0.1";
    const hostPort: number = await this.getOpsApiPublicPort();
    return `http://${ipAddress}:${hostPort}/version`;
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
            [`${this.opsApiHttpPort}/tcp`]: {}, // Fabric Peer GRPC - HTTP
            "7050/tcp": {}, // Orderer GRPC - HTTP
            "7051/tcp": {}, // Peer additional - HTTP
            "7052/tcp": {}, // Peer Chaincode - HTTP
            "7053/tcp": {}, // Peer additional - HTTP
            "7054/tcp": {}, // Fabric CA - HTTP
            "9001/tcp": {}, // supervisord - HTTP
          },
          // This is a workaround needed for macOS which has issues with routing
          // to docker container's IP addresses directly...
          // https://stackoverflow.com/a/39217691
          PublishAllPorts: true,
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
    const fnTag = "FabricTestLedgerV1#waitForHealthCheck()";
    const httpUrl = await this.getOpsApiHttpHost();
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
    const fnTag = "FabricTestLedgerV1#stop()";
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

  public async destroy(): Promise<any> {
    const fnTag = "FabricTestLedgerV1#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      throw new Error(`${fnTag} Containernot found, nothing to destroy.`);
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = "FabricTestLedgerV1#getContainerInfo()";
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    const aContainerInfo = containerInfos.find((ci) => ci.Image === image);

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no image "${image}"`);
    }
  }

  public async getOpsApiPublicPort(): Promise<number> {
    const fnTag = "FabricTestLedgerV1#getOpsApiPublicPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { opsApiHttpPort: thePort } = this;
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
    const fnTag = "FabricTestLedgerV1#getContainerIpAddress()";
    const aContainerInfo = await this.getContainerInfo();

    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(`${fnTag} container not connected to any networks`);
      } else {
        // return IP address of container on the first network that we found it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(`${fnTag} cannot find docker image ${this.imageName}`);
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
    const fnTag = "FabricTestLedgerV1#validateConstructorOptions()";
    const result = Joi.validate<IFabricTestLedgerV1ConstructorOptions>(
      {
        imageVersion: this.imageVersion,
        imageName: this.imageName,
        opsApiHttpPort: this.opsApiHttpPort,
      },
      OPTS_JOI_SCHEMA
    );

    if (result.error) {
      throw new Error(`${fnTag} ${result.error.annotate()}`);
    }
  }
}
