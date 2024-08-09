import { EventEmitter } from "events";
//import path from "path";

import { Config as SshConfig } from "node-ssh";
import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";

import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Checks,
  Bools,
} from "@hyperledger/cactus-common";

/*
 * Contains options for Corda container
 */
export interface ICordaV5TestLedgerConstructorOptions {
  imageVersion?: string;
  imageName?: string;
  publicPort?: number;
  postgresPort?: number;
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
  rpcPortA?: number;
}

/*
 * Provides default options for Corda container
 */
const DEFAULTS = Object.freeze({
  imageVersion: "2024-06-18-issue3293-3e1660df4",
  imageName: "ghcr.io/hyperledger/cacti-corda-5-all-in-one",
  publicPort: 8888,
  postgresPort: 5431,
  rpcPortA: 10008,
});
export const CORDA_V5_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULTS;

/*
 * Provides validations for the Corda container's options
 */
export const JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string().min(1).required(),
  publicPort: Joi.number().min(1).max(65535).required(),
  postgresPort: Joi.number().min(1).max(65535).required(),
});
export const CORDA_V5_TEST_LEDGER_OPTIONS_JOI_SCHEMA = JOI_SCHEMA;

export class CordaV5TestLedger implements ITestLedger {
  public static readonly CLASS_NAME = "CordaV5TestLedger";

  private readonly log: Logger;
  //private readonly envVars: string[];

  public get className(): string {
    return CordaV5TestLedger.CLASS_NAME;
  }
  public readonly rpcPortA: number;
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly publicPort: number;
  public readonly postgresPort: number;
  public readonly emitContainerLogs: boolean;

  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly opts: ICordaV5TestLedgerConstructorOptions = {}) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} options`);

    this.imageVersion = opts.imageVersion || DEFAULTS.imageVersion;
    this.imageName = opts.imageName || DEFAULTS.imageName;

    this.publicPort = opts.publicPort || DEFAULTS.publicPort;
    this.postgresPort = opts.postgresPort || DEFAULTS.postgresPort;
    this.emitContainerLogs = Bools.isBooleanStrict(opts.emitContainerLogs)
      ? (opts.emitContainerLogs as boolean)
      : true;

    this.rpcPortA = opts.rpcPortA || DEFAULTS.rpcPortA;

    this.validateConstructorOptions();
    const label = "corda-v5-test-ledger";
    const level = opts.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainerId(): string {
    const fnTag = `${this.className}.getContainerId()`;
    Checks.nonBlankString(this.containerId, `${fnTag}::containerId`);
    return this.containerId as string;
  }

  public async start(skipPull = false): Promise<Container> {
    const imageFqn = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    if (!skipPull) {
      await Containers.pullImage(imageFqn, {}, this.opts.logLevel);
    }

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          User: "root",
          NetworkMode: "host", // Set the container to use the host network
          Binds: ["/var/run/docker.sock:/var/run/docker.sock"], // Mount the Docker socket
          PublishAllPorts: true,
          Privileged: true,
        },
        {},
        (err: unknown) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
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
          let isHealthy = false;
          do {
            const containerInfo = await this.getContainerInfo();
            this.log.debug(`ContainerInfo.Status=%o`, containerInfo.Status);
            this.log.debug(`ContainerInfo.State=%o`, containerInfo.State);
            isHealthy = containerInfo.Status.endsWith("(healthy)");
            if (!isHealthy) {
              await new Promise((resolve2) => setTimeout(resolve2, 1000));
            }
          } while (!isHealthy);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async logDebugPorts(): Promise<void> {
    const publicPort = await this.getPublicPort();
    this.log.info(`R3 Corda V5 public port: ${publicPort}`);

    const supervisorDUrl = await this.getSupervisorDLocalhostUrl();
    this.log.info(`SupervisorD Web UI accessible: %o`, supervisorDUrl);
  }

  public stop(): Promise<unknown> {
    return Containers.stop(this.getContainer());
  }

  public destroy(): Promise<unknown> {
    const fnTag = `${this.className}.destroy()`;
    if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(
        new Error(`${fnTag} Container was never created, nothing to destroy.`),
      );
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = `${this.className}.getContainerInfo()`;
    const docker = new Docker();
    const containerInfos = await docker.listContainers({});
    const id = this.getContainerId();

    const aContainerInfo = containerInfos.find((ci) => ci.Id === id);

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no container with ID "${id}"`);
    }
  }

  public async getPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(8888, aContainerInfo);
  }

  public async getSupervisorDLocalhostUrl(): Promise<string> {
    const port = await this.getPublicPort();
    return `https://localhost:${port}/api/v1/swagger#`;
  }

  public async getSSHPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(22, aContainerInfo);
  }

  public async getSshConfig(): Promise<SshConfig> {
    //port 22 is not being checked as of now because we can't modify the export ports unless we change the gradle sample
    //const publicPort = await this.getSSHPublicPort();
    const sshConfig: SshConfig = {
      host: "127.0.0.1",
      port: 22,
      username: "root",
    };

    return sshConfig;
  }

  public getContainer(): Container {
    const fnTag = `${this.className}.getContainer()`;
    if (!this.container) {
      throw new Error(`${fnTag} container not set on this instance yet.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  private validateConstructorOptions(): void {
    const fnTag = `${this.className}#validateConstructorOptions()`;
    const validationResult = JOI_SCHEMA.validate({
      imageVersion: this.imageVersion,
      imageName: this.imageName,
      publicPort: this.publicPort,
      postgresPort: this.postgresPort,
    });

    if (validationResult.error) {
      throw new Error(`${fnTag} ${validationResult.error.annotate()}`);
    }
  }
}

export function extractShortHash(shortHashID: string, name: string) {
  const regex = new RegExp(`MyCorDapp\\s*([A-Z0-9]*)\\s*CN=${name}`);
  const match = shortHashID.match(regex);
  if (match) {
    return match[1];
  } else {
    return "err";
  }
}
