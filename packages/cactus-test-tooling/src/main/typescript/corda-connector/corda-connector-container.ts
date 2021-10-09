import { EventEmitter } from "events";

import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Checks,
  Bools,
} from "@hyperledger/cactus-common";

import { Containers } from "../common/containers";

/*
 * Provides default options for Corda connector server
 */
const DEFAULTS = Object.freeze({
  imageVersion: "2021-03-01-7e07b5b",
  imageName: "petermetz/cactus-connector-corda-server",
  apiPort: 8080,
  envVars: [],
});
export const CORDA_CONNECTOR_DEFAULT_OPTIONS = DEFAULTS;

/*
 * Provides validations for the Corda container's options
 */
const JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string().min(1).required(),
  apiPort: Joi.number().min(1).max(65535).required(),
});
export const CORDA_CONNECTOR_OPTIONS_JOI_SCHEMA = JOI_SCHEMA;

/*
 * Contains options for Corda container
 */
export interface ICordaConnectorContainerOptions {
  imageVersion?: string;
  imageName?: string;
  apiPort?: number;
  logLevel?: LogLevelDesc;
  envVars?: string[];
  emitContainerLogs?: boolean;
}

/**
 * Class responsible for programmatically managing a container that is running
 * the image made for hosting a connector plugin for Corda, written in Kotlin, a
 * JVM language because the JMS messages one needs to push to Corda for RPC
 * execution are particularly tricky to produce from a NodeJS app.
 */
export class CordaConnectorContainer {
  public static readonly CLASS_NAME = "CordaConnectorContainer";

  private readonly log: Logger;
  private readonly envVars: string[];
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly apiPort: number;
  public readonly emitContainerLogs: boolean;
  private container: Container | undefined;
  private containerId: string | undefined;

  public get className(): string {
    return CordaConnectorContainer.CLASS_NAME;
  }

  constructor(public readonly opts: ICordaConnectorContainerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);

    this.imageVersion = opts.imageVersion || DEFAULTS.imageVersion;
    this.imageName = opts.imageName || DEFAULTS.imageName;

    this.apiPort = opts.apiPort || DEFAULTS.apiPort;

    this.emitContainerLogs = Bools.isBooleanStrict(opts.emitContainerLogs)
      ? (opts.emitContainerLogs as boolean)
      : true;

    this.envVars = opts.envVars ? opts.envVars : DEFAULTS.envVars;
    Checks.truthy(Array.isArray(this.envVars), `${fnTag}:envVars not an array`);

    this.validateConstructorOptions();

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
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
          ExposedPorts: {
            [`${this.apiPort}/tcp`]: {}, // REST API HTTP port
            [`9001/tcp`]: {}, // SupervisorD Web UI
          },
          PublishAllPorts: true,
          Env: this.envVars,
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
          await Containers.waitForHealthCheck(this.containerId);
          resolve(container);
        } catch (ex) {
          this.log.error(`Waiting for healthcheck to pass failed:`, ex);
          reject(ex);
        }
      });
    });
  }

  public async logDebugPorts(): Promise<void> {
    const apiUrl = await this.getSupervisorDLocalhostUrl();
    this.log.info(`HTTP REST API accessible: %o`, apiUrl);

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

  public async getApiPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.apiPort, aContainerInfo);
  }

  public async getSupervisorDPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(9001, aContainerInfo);
  }

  public async getSupervisorDLocalhostUrl(): Promise<string> {
    const port = await this.getSupervisorDPublicPort();
    return `http://localhost:${port}`;
  }

  public async getApiLocalhostUrl(): Promise<string> {
    const port = await this.getApiPublicPort();
    return `http://localhost:${port}`;
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
      apiPort: this.apiPort,
    });

    if (validationResult.error) {
      throw new Error(`${fnTag} ${validationResult.error.annotate()}`);
    }
  }
}
