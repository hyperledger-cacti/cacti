import { EventEmitter } from "events";
//import path from "path";

import { NodeSSH, Config as SshConfig } from "node-ssh";
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

//import { SampleCordappEnum, SAMPLE_CORDAPP_DATA } from "./sample-cordapp-enum";
//import { ICordappJarFile } from "./cordapp-jar-file";

/*
 * Contains options for Corda container
 */
export interface ICordaV5TestLedgerConstructorOptions {
  imageVersion?: string;
  imageName?: string;
  rpcPortNotary?: number;
  rpcPortEarth?: number;
  rpcPortMars?: number;
  rpcPortPluto?: number;
  logLevel?: LogLevelDesc;
  //envVars?: string[];
  emitContainerLogs?: boolean;
}

/*
 * Provides default options for Corda container
 */
const DEFAULTS = Object.freeze({
  imageVersion: "2022-01-13--test-1479",
  imageName: "ghcr.io/hyperledger/cactus-corda-5-all-in-one-solar",
  rpcPortNotary: 12122,
  rpcPortEarth: 12112,
  rpcPortMars: 12116,
  rpcPortPluto: 12119,
});
export const CORDA_V5_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULTS;

/*
 * Provides validations for the Corda container's options
 */
export const JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string().min(1).required(),
  rpcPortNotary: Joi.number().min(1).max(65535).required(),
  rpcPortEarth: Joi.number().min(1).max(65535).required(),
  rpcPortMars: Joi.number().min(1).max(65535).required(),
  rpcPortPluto: Joi.number().min(1).max(65535).required(),
});
export const CORDA_V5_TEST_LEDGER_OPTIONS_JOI_SCHEMA = JOI_SCHEMA;

export class CordaV5TestLedger implements ITestLedger {
  public static readonly CLASS_NAME = "CordaV5TestLedger";

  private readonly log: Logger;
  //private readonly envVars: string[];

  public get className(): string {
    return CordaV5TestLedger.CLASS_NAME;
  }

  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly rpcPortNotary: number;
  public readonly rpcPortEarth: number;
  public readonly rpcPortMars: number;
  public readonly rpcPortPluto: number;
  public readonly emitContainerLogs: boolean;

  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly opts: ICordaV5TestLedgerConstructorOptions = {}) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} options`);

    this.imageVersion = opts.imageVersion || DEFAULTS.imageVersion;
    this.imageName = opts.imageName || DEFAULTS.imageName;

    this.rpcPortEarth = opts.rpcPortEarth || DEFAULTS.rpcPortEarth;
    this.rpcPortMars = opts.rpcPortMars || DEFAULTS.rpcPortMars;
    this.rpcPortPluto = opts.rpcPortPluto || DEFAULTS.rpcPortPluto;
    this.rpcPortNotary = opts.rpcPortNotary || DEFAULTS.rpcPortNotary;
    this.emitContainerLogs = Bools.isBooleanStrict(opts.emitContainerLogs)
      ? (opts.emitContainerLogs as boolean)
      : true;

    /*  this.envVars = opts.envVars ? opts.envVars : DEFAULTS.envVars;
    Checks.truthy(Array.isArray(this.envVars), `${fnTag}:envVars not an array`);*/

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
          ExposedPorts: {
            [`${this.rpcPortNotary}/tcp`]: {}, // corda Notary RPC
            [`${this.rpcPortEarth}/tcp`]: {}, // corda PartyEarth RPC
            [`${this.rpcPortMars}/tcp`]: {}, // corda PartyMars RPC
            [`${this.rpcPortPluto}/tcp`]: {}, // corda PartyPluto RPC
            "22/tcp": {}, // ssh server
          },
          PublishAllPorts: true,
          Privileged: true,
          // Env: this.envVars,
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
    const partyNotaryRpcPort = await this.getRpcNotaryPublicPort();
    const partyEarthRpcPort = await this.getRpcAPublicPort();
    const partyMarsRpcPort = await this.getRpcBPublicPort();
    const partyPlutoRpcPort = await this.getRpcCPublicPort();
    this.log.info(`Party Notary RPC Port: ${partyNotaryRpcPort}`);
    this.log.info(`Party A RPC Port: ${partyEarthRpcPort}`);
    this.log.info(`Party B RPC Port: ${partyMarsRpcPort}`);
    this.log.info(`Party C RPC Port: ${partyPlutoRpcPort}`);

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

  public async buildCordapp(): Promise<void> {
    const fnTag = `${this.className}.buildCordapp()`;
    const sshConfig = await this.getSshConfig();
    const ssh = new NodeSSH();
    try {
      await ssh.connect(sshConfig);
    } catch (ex) {
      this.log.error(`Failed to establish SSH connection to Corda node.`, ex);
      throw ex;
    }

    try {
      const cmd = `/root/bin/corda-cli/bin/corda-cli package install -n solar-system /corda5-solarsystem-contracts-demo/solar-system.cpb`;
      const response = await ssh.execCommand(cmd);
      const { code, signal, stderr, stdout } = response;
      this.log.debug(`${fnTag}:code=%o`, code);
      this.log.debug(`${fnTag}:signal=%o`, signal);
      this.log.debug(`${fnTag}:stderr=%o`, stderr);
      this.log.debug(`${fnTag}:stdout=%o`, stdout);
    } finally {
      ssh.dispose();
    }
  }

  public async getRpcNotaryPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.rpcPortNotary, aContainerInfo);
  }

  public async getRpcAPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.rpcPortEarth, aContainerInfo);
  }

  public async getRpcBPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.rpcPortMars, aContainerInfo);
  }

  public async getRpcCPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.rpcPortPluto, aContainerInfo);
  }

  public async getSupervisorDPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(9001, aContainerInfo);
  }

  public async getSupervisorDLocalhostUrl(): Promise<string> {
    const port = await this.getSupervisorDPublicPort();
    return `http://localhost:${port}`;
  }

  public async getSSHPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(22, aContainerInfo);
  }

  public async getSshConfig(): Promise<SshConfig> {
    const publicPort = await this.getSSHPublicPort();
    const sshConfig: SshConfig = {
      host: "0.0.0.0",
      port: publicPort,
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
      rpcPortNotary: this.rpcPortNotary,
      rpcPortEarth: this.rpcPortEarth,
      rpcPortMars: this.rpcPortMars,
      rpcPortPluto: this.rpcPortPluto,
    });

    if (validationResult.error) {
      throw new Error(`${fnTag} ${validationResult.error.annotate()}`);
    }
  }
}
