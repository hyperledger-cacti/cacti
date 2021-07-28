//import all packages
import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";
//import { Containers } from "../common/containers";
//import { NumberLiteralType } from "typescript";
//import { DefaultSerializer } from "v8";
//import { DEFAULTS } from "ts-node";

/*
 * Contains options for Iroha container
 */
export interface IIrohaTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  rpcToriiPort?: number;
  envVars?: string[];
  logLevel?: LogLevelDesc;
}

/*
 * Provides default options for Iroha container
 */
export const IROHA_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "1.2.0",
  containerImageName: "hyperledger/iroha",
  rpcToriiPort: 50051, //grpc
  envVars: [
    "IROHA_POSTGRES_HOST=postgres_1",
    "IROHA_POSTGRES_PORT=5432",
    "IROHA_POSTGRES_USER=postgres",
    "IROHA_POSTGRES_PASSWORD=mysecretpassword",
    "KEY=node0",
  ],
});

//can we go inside the docker container and then test within the docker container
///initiated by the dockrode service
/*
 * Provides validations for Iroha container's options
 */
export const IROHA_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    containerImageVersion: Joi.string().min(5).required(),
    containerImageName: Joi.string().min(1).required(),
    rpcToriiPort: Joi.number().min(1024).max(65535).required(),
    envVars: Joi.array().allow(null).required(),
  },
);

export class IrohaTestLedger implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly rpcToriiPort: number;
  public readonly envVars: string[];

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: IIrohaTestLedgerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(`IrohaTestLedger#ctor options was falsy.`);
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      IROHA_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      IROHA_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;
    this.rpcToriiPort =
      options.rpcToriiPort || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.rpcToriiPort;
    this.envVars = options.envVars || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.envVars;

    this.validateConstructorOptions();
    const label = "iroha-test-ledger";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "IrohaTestLedger#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getRpcToriiPortHost(): Promise<string> {
    const ipAddress = "127.0.0.1";
    const hostPort: number = await this.getRpcToriiPort();
    return `http://${ipAddress}:${hostPort}`;
  }

  public async getFileContents(filePath: string): Promise<string> {
    const response: any = await this.getContainer().getArchive({
      path: filePath,
    });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents = "";
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

  /**
   * Output is based on the standard Iroha genesis.block contents.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public getGenesisAdminAccount(): string {
    return "admin@test";
  }

  /**
   * Output is based on the standard Iroha admin user public key.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/admin%40test.pub
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public getGenesisAccountPubKey(): string {
    return "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910";
  }

  /**
   * Output is based on the standard Iroha admin user private key.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/admin%40test.priv
   */
  public getGenesisAccountPrivKey(): string {
    return "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70";
  }

  public async start(): Promise<Container> {
    const imageFqn = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();
    this.log.debug(`Creating Iroha volume blockstore...`);
    const ccacheVolume = {
      Name: "blockstore",
      Driver: "local",
      Mountpoint: "/var/lib/docker/volumes/blockstore",
    };
    docker.createVolume(ccacheVolume);
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
            [`${this.rpcToriiPort}/tcp`]: {}, // Iroha RPC - Torii
          },
          PublishAllPorts: true,
          Env: this.envVars,
          Healthcheck: {
            Test: ["CMD-SHELL", "netcat -zv 127.0.0.1 50051 || exit 1"],
            Interval: 1000000000, // 1 second
            Timeout: 3000000000, // 3 seconds
            Retries: 299,
            StartPeriod: 3000000000, // 1 second
          },
          HostConfig: {
            PortBindings: {
              "50051/tcp": [
                {
                  HostPort: "50051",
                },
              ],
            },
            //AutoRemove: true,
            NetworkMode: "iroha-network",
            Binds: [
              //`/home/han/workspace/cactus_dev/packages/cactus-test-tooling/src/main/typescript/iroha/example:/opt/iroha_data`,
              //              `$(pwd)/example:/opt/iroha_data`,
              `blockstore:/tmp/block_store`,
            ],
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
    const fnTag = "IrohaTestLedger#waitForHealthCheck()";
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

  // public async waitForHealthCheck(timeoutMs = 120000): Promise<void> {
  //   const fnTag = "IrohaTestLedger#waitForHealthCheck()";
  //   const httpUrl = await this.getRpcToriiPortHost();
  //   const startedAt = Date.now();
  //   let reachable = false;
  //   do {
  //     try {
  //       const res = await axios.get(httpUrl);
  //       reachable = res.status > 199 && res.status < 300;
  //     } catch (ex) {
  //       reachable = false;
  //       if (Date.now() >= startedAt + timeoutMs) {
  //         throw new Error(`${fnTag} timed out (${timeoutMs}ms) -> ${ex.stack}`);
  //       }
  //     }
  //     await new Promise((resolve2) => setTimeout(resolve2, 100));
  //   } while (!reachable);
  // }

  public stop(): Promise<any> {
    const fnTag = "IrohaTestLedger#stop()";
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
    //return Containers.stop(this.getContainer());
  }

  public destroy(): Promise<any> {
    //remove volume
    const fnTag = "IrohaTestLedger#destroy()";
    //remove container
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
      throw new Error(`IrohaTestLedger#getContainerInfo() no image "${image}"`);
    }
  }

  public async getRpcToriiPort(): Promise<number> {
    const fnTag = "IrohaTestLedger#getRpcToriiPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { rpcToriiPort: thePort } = this;
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
    const fnTag = "IrohaTestLedger#getContainerIpAddress()";
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
          );
        }
      });
    });
  }

  private validateConstructorOptions(): void {
    const validationResult = Joi.validate<IIrohaTestLedgerConstructorOptions>(
      {
        containerImageVersion: this.containerImageVersion,
        containerImageName: this.containerImageName,
        rpcToriiPort: this.rpcToriiPort,
        envVars: this.envVars,
      },
      IROHA_TEST_LEDGER_OPTIONS_JOI_SCHEMA,
    );

    if (validationResult.error) {
      throw new Error(
        `IrohaTestLedger#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
