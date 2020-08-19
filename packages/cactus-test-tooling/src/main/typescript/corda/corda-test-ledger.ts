import Docker, { Container, ContainerInfo, Network } from "dockerode";
import isPortReachable from "is-port-reachable";
import Joi from "joi";
import { EventEmitter } from "events";
import { ITestLedger } from "../i-test-ledger";

/*
 * Contains options for Corda container
 */
export interface ICordaTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  rpcPortA?: number;
}

/*
 * Provides default options for Corda container
 */
export const CORDA_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "latest",
  containerImageName: "jweate/corda-all-in-one",
  rpcPortA: 10013,
});

/*
 * Provides validations for the Corda container's options
 */
export const CORDA_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    containerImageVersion: Joi.string().min(5).required(),
    containerImageName: Joi.string().min(1).required(),
    rpcPortA: Joi.number().min(1).max(65535).required(),
  }
);

export class CordaTestLedger implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly rpcPortA: number;

  private container: Container | undefined;

  constructor(
    public readonly options: ICordaTestLedgerConstructorOptions = {}
  ) {
    // check if options exists
    if (!options) {
      throw new TypeError(`CordaTestLedger#ctor options was falsy.`);
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      CORDA_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      CORDA_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;

    this.rpcPortA =
      options.rpcPortA || CORDA_TEST_LEDGER_DEFAULT_OPTIONS.rpcPortA;

    this.validateConstructorOptions();
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
          // TODO: scrutinize this and eliminate needing root if possible
          // (might not be possible due to something with Corda itself, but we have to investigate)
          User: "root",
          ExposedPorts: {
            [`${this.rpcPortA}/tcp`]: {}, // corda PartyA RPC
          },
          // will allocate random port on host and then we can use the getRpcAHostPort() method to determine
          // what that port exactly is. This is a workaround needed for macOS which has issues with routing to docker
          // container's IP addresses directly...
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
        // once the container has started, we wait until the the corda RPC API starts listening on the designated port
        // which we determine by continously trying to establish a socket until it actually works
        const host: string = "127.0.0.1";
        const port: number = await this.getRpcAPublicPort();
        try {
          let reachable: boolean = false;
          do {
            reachable = await isPortReachable(port, { host });
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
            `CordaTestLedger#stop() Container was not running to begin with.`
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
          `CordaTestLedger#destroy() Container was never created, nothing to destroy.`
        )
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

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    const aContainerInfo = containerInfos.find((ci) => ci.Image === image);

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`CordaTestLedger#getContainerInfo() no image "${image}"`);
    }
  }

  /**
   * Example of how the `portMappings` variable looks like at runtime when the
   * create options has PublishAllPorts: true
   *
   * ```json
   * "[
   *   {
   *       "IP": "0.0.0.0",
   *       "PrivatePort": 10200,
   *       "PublicPort": 40003,
   *       "Type": "tcp"
   *   },
   *   {
   *       "IP": "0.0.0.0",
   *       "PrivatePort": 10201,
   *       "PublicPort": 40002,
   *       "Type": "tcp"
   *   },
   *   {
   *       "IP": "0.0.0.0",
   *       "PrivatePort": 10013,
   *       "PublicPort": 40005,
   *       "Type": "tcp"
   *   },
   *   {
   *       "IP": "0.0.0.0",
   *       "PrivatePort": 10014,
   *       "PublicPort": 40004,
   *       "Type": "tcp"
   *   }
   * ]
   * ```
   *
   */
  public async getRpcAPublicPort(): Promise<number> {
    const fnTag = "CordaTestLedger#getRpcAPublicPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { Ports: portMappings } = aContainerInfo;

    if (portMappings.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = portMappings.find((x) => x.PrivatePort === this.rpcPortA);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${this.rpcPortA} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${this.rpcPortA} mapped to localhost`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${this.rpcPortA}`);
    }
  }

  public async getRpcApiHttpHost(): Promise<string> {
    const publicPort: number = await this.getRpcAPublicPort();
    return `http://localhost:${publicPort}`;
  }

  public async getContainerIpAddress(): Promise<string> {
    const aContainerInfo = await this.getContainerInfo();
    const { NetworkSettings } = aContainerInfo;
    const networkNames: string[] = Object.keys(NetworkSettings.Networks);
    if (networkNames.length < 1) {
      throw new Error(`CordaTestLedger#getContainerIpAddress() no networks`);
    } else {
      // return IP address of container on the first network that we found it connected to. Make this configurable?
      return NetworkSettings.Networks[networkNames[0]].IPAddress;
    }
  }

  public getContainer(): Container {
    if (!this.container) {
      throw new Error(
        `CordaTestLedger container wasn't started by this instance yet.`
      );
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  private validateConstructorOptions(): void {
    const validationResult = Joi.validate<ICordaTestLedgerConstructorOptions>(
      {
        containerImageVersion: this.containerImageVersion,
        containerImageName: this.containerImageName,
        rpcPortA: this.rpcPortA,
      },
      CORDA_TEST_LEDGER_OPTIONS_JOI_SCHEMA
    );

    if (validationResult.error) {
      throw new Error(
        `CordaTestLedger#ctor ${validationResult.error.annotate()}`
      );
    }
  }
}
