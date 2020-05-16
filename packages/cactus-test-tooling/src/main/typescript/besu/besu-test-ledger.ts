import Docker, { Container } from "dockerode";
import isPortReachable from "is-port-reachable";
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
}

export const BESU_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "latest",
  containerImageName: "petermetz/besu-all-in-one",
  rpcApiHttpPort: 8545,
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
  }
);

export class BesuTestLedger implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly rpcApiHttpPort: number;

  private container: Container | undefined;

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

    this.validateConstructorOptions();
  }

  public getContainer(): Container {
    if (!this.container) {
      throw new Error(
        `BesuTestLedger#getBesuKeyPair() container wasn't started by this instance yet.`
      );
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getRpcApiHttpHost(): Promise<string> {
    const ipAddress: string = await this.getContainerIpAddress();
    return `http://${ipAddress}:${this.rpcApiHttpPort}`;
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
          Hostconfig: {
            PortBindings: {
              // [`${this.rpcApiHttpPort}/tcp`]: [{ HostPort: '8545', }],
              // '8546/tcp': [{ HostPort: '8546', }],
              // '8080/tcp': [{ HostPort: '8080', }],
              // '8888/tcp': [{ HostPort: '8888', }],
              // '9001/tcp': [{ HostPort: '9001', }],
              // '9545/tcp': [{ HostPort: '9545', }],
            },
          },
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
        // once the container has started, we wait until the the besu RPC API starts listening on the designated port
        // which we determine by continously trying to establish a socket until it actually works
        const host: string = await this.getContainerIpAddress();
        try {
          let reachable: boolean = false;
          do {
            reachable = await isPortReachable(this.rpcApiHttpPort, { host });
            await new Promise((resolve2) => setTimeout(resolve2, 100));
          } while (!reachable);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public stop(): Promise<any> {
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
        return reject(
          new Error(
            `BesuTestLedger#stop() Container was not running to begin with.`
          )
        );
      }
    });
  }

  public destroy(): Promise<any> {
    if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(
        new Error(
          `BesuTestLedger#destroy() Container was never created, nothing to destroy.`
        )
      );
    }
  }

  public async getContainerIpAddress(): Promise<string> {
    const docker = new Docker();
    const containerImageName = this.getContainerImageName();
    const containerInfos: Docker.ContainerInfo[] = await docker.listContainers(
      {}
    );

    const aContainerInfo = containerInfos.find(
      (ci) => ci.Image === containerImageName
    );
    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(
          `BesuTestLedger#getContainerIpAddress() no network found: ${JSON.stringify(
            NetworkSettings
          )}`
        );
      } else {
        // return IP address of container on the first network that we found it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(
        `BesuTestLedger#getContainerIpAddress() cannot find container image ${this.containerImageName}`
      );
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
