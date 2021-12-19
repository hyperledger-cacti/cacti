import { EventEmitter } from "events";
import path from "path";

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

import { SampleCordappEnum, SAMPLE_CORDAPP_DATA } from "./sample-cordapp-enum";
import { ICordappJarFile } from "./cordapp-jar-file";

/*
 * Contains options for Corda container
 */
export interface ICordaTestLedgerConstructorOptions {
  imageVersion?: string;
  imageName?: string;
  rpcPortNotary?: number;
  rpcPortA?: number;
  rpcPortB?: number;
  rpcPortC?: number;
  logLevel?: LogLevelDesc;
  envVars?: string[];
  emitContainerLogs?: boolean;
}

/*
 * Provides default options for Corda container
 */
const DEFAULTS = Object.freeze({
  imageVersion: "2021-03-01-7e07b5b",
  imageName: "petermetz/cactus-corda-4-6-all-in-one-obligation",
  rpcPortNotary: 10003,
  rpcPortA: 10008,
  rpcPortB: 10011,
  rpcPortC: 10014,
  envVars: [
    "PARTY_A_NODE_ENABLED=true",
    "PARTY_B_NODE_ENABLED=true",
    "PARTY_C_NODE_ENABLED=true",
  ],
});
export const CORDA_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULTS;

/*
 * Provides validations for the Corda container's options
 */
export const JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string().min(1).required(),
  rpcPortNotary: Joi.number().min(1).max(65535).required(),
  rpcPortA: Joi.number().min(1).max(65535).required(),
  rpcPortB: Joi.number().min(1).max(65535).required(),
  rpcPortC: Joi.number().min(1).max(65535).required(),
});
export const CORDA_TEST_LEDGER_OPTIONS_JOI_SCHEMA = JOI_SCHEMA;

export class CordaTestLedger implements ITestLedger {
  public static readonly CLASS_NAME = "CordaTestLedger";

  private readonly log: Logger;
  private readonly envVars: string[];

  public get className(): string {
    return CordaTestLedger.CLASS_NAME;
  }

  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly rpcPortNotary: number;
  public readonly rpcPortA: number;
  public readonly rpcPortB: number;
  public readonly rpcPortC: number;
  public readonly emitContainerLogs: boolean;

  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly opts: ICordaTestLedgerConstructorOptions = {}) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} options`);

    this.imageVersion = opts.imageVersion || DEFAULTS.imageVersion;
    this.imageName = opts.imageName || DEFAULTS.imageName;

    this.rpcPortA = opts.rpcPortA || DEFAULTS.rpcPortA;
    this.rpcPortB = opts.rpcPortB || DEFAULTS.rpcPortB;
    this.rpcPortC = opts.rpcPortC || DEFAULTS.rpcPortC;
    this.rpcPortNotary = opts.rpcPortNotary || DEFAULTS.rpcPortNotary;
    this.emitContainerLogs = Bools.isBooleanStrict(opts.emitContainerLogs)
      ? (opts.emitContainerLogs as boolean)
      : true;

    this.envVars = opts.envVars ? opts.envVars : DEFAULTS.envVars;
    Checks.truthy(Array.isArray(this.envVars), `${fnTag}:envVars not an array`);

    this.validateConstructorOptions();
    const label = "corda-test-ledger";
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
          // TODO: scrutinize this and eliminate needing root if possible
          // (might not be possible due to something with Corda itself, but we have to investigate)
          User: "root",
          ExposedPorts: {
            [`${this.rpcPortNotary}/tcp`]: {}, // corda Notary RPC
            [`${this.rpcPortA}/tcp`]: {}, // corda PartyA RPC
            [`${this.rpcPortB}/tcp`]: {}, // corda PartyB RPC
            [`${this.rpcPortC}/tcp`]: {}, // corda PartyC RPC
            "22/tcp": {}, // ssh server
          },
          PublishAllPorts: true,
          // TODO: this can be removed once the new docker image is published and
          // specified as the default one to be used by the tests.
          // Healthcheck: {
          //   Test: [
          //     "CMD-SHELL",
          //     `curl -v 'http://localhost:7005/jolokia/exec/org.apache.activemq.artemis:address=%22rpc.server%22,broker=%22RPC%22,component=addresses,queue=%22rpc.server%22,routing-type=%22multicast%22,subcomponent=queues/countMessages()/'`,
          //   ],
          //   Interval: 1000000000, // 1 second
          //   Timeout: 3000000000, // 3 seconds
          //   Retries: 99,
          //   StartPeriod: 1000000000, // 1 second
          // },
          Privileged: true,
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
    const partyARpcPort = await this.getRpcAPublicPort();
    const partyBRpcPort = await this.getRpcBPublicPort();
    const partyCRpcPort = await this.getRpcCPublicPort();
    this.log.info(`Party Notary RPC Port: ${partyNotaryRpcPort}`);
    this.log.info(`Party A RPC Port: ${partyARpcPort}`);
    this.log.info(`Party B RPC Port: ${partyBRpcPort}`);
    this.log.info(`Party C RPC Port: ${partyCRpcPort}`);

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

  public async pullCordappJars(
    sampleCordapp: SampleCordappEnum,
  ): Promise<ICordappJarFile[]> {
    const fnTag = `${this.className}.pullCordappJars()`;
    Checks.truthy(sampleCordapp, `${fnTag}:sampleCordapp`);
    await this.buildCordapp(sampleCordapp);
    const container = this.getContainer();
    // const cordappRootDir = SAMPLE_CORDAPP_ROOT_DIRS[sampleCordapp];
    // const cordaRelativePaths = SAMPLE_CORDAPP_JAR_RELATIVE_PATHS[sampleCordapp];
    const cordappData = SAMPLE_CORDAPP_DATA[sampleCordapp];

    const jars: ICordappJarFile[] = [];

    for (const jarFile of cordappData.jars) {
      const jarPath = path.join(cordappData.rootDir, jarFile.jarRelativePath);
      this.log.debug(`Pulling jar file from container at: %o`, jarPath);
      const jar = await Containers.pullBinaryFile(container, jarPath);
      jars.push({
        contentBase64: jar.toString("base64"),
        filename: `${sampleCordapp}${jarFile.fileName}`,
        hasDbMigrations: true,
      });
      this.log.debug(`Pulled jar (%o bytes) %o`, jarPath, jar.length);
    }

    if (jars.length == 0) {
      throw new Error(`${fnTag} no jars found for this SampleCordappEnum.`);
    }

    return jars;
  }

  public async buildCordapp(sampleCordapp: SampleCordappEnum): Promise<void> {
    const fnTag = `${this.className}.buildCordapp()`;
    Checks.truthy(sampleCordapp, `${fnTag}:sampleCordapp`);
    const sshConfig = await this.getSshConfig();
    const ssh = new NodeSSH();
    try {
      await ssh.connect(sshConfig);
    } catch (ex) {
      this.log.error(`Failed to establish SSH connection to Corda node.`, ex);
      throw ex;
    }

    const cwd = SAMPLE_CORDAPP_DATA[sampleCordapp].rootDir;

    try {
      const cmd = `./gradlew build -x test`;
      this.log.debug(`${fnTag}:CMD=%o, CWD=%o`, cmd, cwd);
      const response = await ssh.execCommand(cmd, { cwd });
      const { code, signal, stderr, stdout } = response;
      this.log.debug(`${fnTag}:code=%o`, code);
      this.log.debug(`${fnTag}:signal=%o`, signal);
      this.log.debug(`${fnTag}:stderr=%o`, stderr);
      this.log.debug(`${fnTag}:stdout=%o`, stdout);
      // const jarPath = `${cwd}contracts/build/libs/contracts-1.0.jar`;
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
    return Containers.getPublicPort(this.rpcPortA, aContainerInfo);
  }

  public async getRpcBPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.rpcPortB, aContainerInfo);
  }

  public async getRpcCPublicPort(): Promise<number> {
    const aContainerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.rpcPortC, aContainerInfo);
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

  public async getCorDappsDirPartyA(): Promise<string> {
    return "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/cordapps";
  }

  public async getCorDappsDirPartyB(): Promise<string> {
    return "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/cordapps";
  }

  public async getCorDappsDirPartyC(): Promise<string> {
    return "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantC/cordapps";
  }

  public async getCorDappsDirPartyNotary(): Promise<string> {
    return "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/Notary/cordapps";
  }

  public async getSshConfig(): Promise<SshConfig> {
    const privKeyPath = `/etc/hyperledger/cactus/corda-aio-image.key`;
    const container = this.getContainer();
    const privateKey = await Containers.pullFile(container, privKeyPath);
    const publicPort = await this.getSSHPublicPort();
    const sshConfig: SshConfig = {
      host: "127.0.0.1",
      port: publicPort,
      username: "root",
      privateKey,
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
      rpcPortA: this.rpcPortA,
      rpcPortB: this.rpcPortB,
      rpcPortC: this.rpcPortC,
    });

    if (validationResult.error) {
      throw new Error(`${fnTag} ${validationResult.error.annotate()}`);
    }
  }
}
