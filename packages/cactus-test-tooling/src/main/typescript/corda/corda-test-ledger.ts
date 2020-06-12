import Docker, { Container } from "dockerode";
import isPortReachable from "is-port-reachable";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";
import { IKeyPair } from "../i-key-pair";

/*
 * Contains options for Corda container
 */
export interface ICordaTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
}

/*
 * Provides default options for Corda container
 */
export const CORDA_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "latest",
  containerImageName: "jweate/corda-all-in-one",
});

/*
 * Provides validations for the Corda container's options
 */
export const CORDA_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    containerImageVersion: Joi.string().min(5).required(),
    containerImageName: Joi.string().min(1).required(),
  }
);

export class CordaTestLedger implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;

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
          User: "root",
          ExposedPorts: {
            "10013/tcp": {}, // corda PartyA RPC
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
        // once the container has started, we wait until the the corda RPC API starts listening on the designated port
        // which we determine by continously trying to establish a socket until it actually works
        const host: string = await this.getContainerIpAddress();
        try {
          let reachable: boolean = false;
          do {
            reachable = await isPortReachable(10013, { host });
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
          `CordaTestLedger#getContainerIpAddress() no network found: ${JSON.stringify(
            NetworkSettings
          )}`
        );
      } else {
        // return IP address of container on the first network that we found it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(
        `CordaTestLedger#getContainerIpAddress() cannot find container image ${this.containerImageName}`
      );
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
