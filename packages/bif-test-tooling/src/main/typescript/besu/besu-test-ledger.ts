import Docker, { Container } from 'dockerode';
import Joi from 'joi';
import { EventEmitter } from 'events';
import { ITestLedger } from "../i-test-ledger";

export interface IBesuTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
}

export const DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: 'latest',
  containerImageName: 'petermetz/besu-all-in-one',
});

export const OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  containerImageVersion: Joi.string().min(5).required(),
  containerImageName: Joi.string().min(1).required(),
});

export class BesuTestLedger implements ITestLedger {

  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  private container: Container | undefined;

  constructor(public readonly options: IBesuTestLedgerConstructorOptions = {}) {
    if (!options) {
      throw new TypeError(`BesuTestLedger#ctor options was falsy.`);
    }
    this.containerImageVersion = options.containerImageVersion || DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName = options.containerImageName || DEFAULT_OPTIONS.containerImageName;

    this.validateConstructorOptions();
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
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
            '8545/tcp': {},
            '8546/tcp': {},
            '8888/tcp': {},
            '8080/tcp': {},
            '9001/tcp': {},
            '9545/tcp': {},
          },
          Hostconfig: {
            // PortBindings: {
            //   '8545/tcp': [{ HostPort: '8545', }],
            //   '8546/tcp': [{ HostPort: '8546', }],
            //   '8080/tcp': [{ HostPort: '8080', }],
            //   '8888/tcp': [{ HostPort: '8888', }],
            //   '9001/tcp': [{ HostPort: '9001', }],
            //   '9545/tcp': [{ HostPort: '9545', }],
            // },
          },
        },
        {
        },
        (err: any) => {
          if (err) {
            reject(err);
          }
        }
      );

      eventEmitter.once('start', (container: Container) => {
        this.container = container;
        resolve(container);
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
        return reject(new Error(`BesuTestLedger#stop() Container was not running to begin with.`));
      }
    });
  }

  public destroy(): Promise<any> {
    if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(new Error(`BesuTestLedger#destroy() Container was never created, nothing to destroy.`));
    }
  }

  public async getContainerIpAddress(): Promise<string> {
    const docker = new Docker();
    const containerImageName = this.getContainerImageName();
    const containerInfos: Docker.ContainerInfo[] = await docker.listContainers({});

    const aContainerInfo = containerInfos.find(ci => ci.Image === containerImageName);
    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(`BesuTestLedger#getContainerIpAddress() no network found: ${JSON.stringify(NetworkSettings)}`);
      } else {
        // return IP address of container on the first network that we found it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(`BesuTestLedger#getContainerIpAddress() cannot find container image ${this.containerImageName}`);
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
      },
      OPTIONS_JOI_SCHEMA
    );

    if (validationResult.error) {
      throw new Error(`BesuTestLedger#ctor ${validationResult.error.annotate()}`)
    }
  }
}
