import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Bools,
  Checks,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { IKeyPair } from "../i-key-pair";
import { Containers } from "../common/containers";

/*
 * Contains options for Iroha container
 */
export interface IIrohaTestLedgerOptions {
  readonly adminPriv?: string;
  readonly adminPub?: string;
  readonly nodePriv?: string;
  readonly nodePub?: string;
  readonly tlsCert?: string;
  readonly tlsKey?: string;
  readonly toriiTlsPort?: number;
  readonly postgresHost: string;
  readonly postgresPort: number;
  readonly imageVersion?: string;
  readonly imageName?: string;
  readonly rpcToriiPort?: number;
  readonly envVars?: string[];
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
}

/*
 * Provides default options for Iroha container
 */
export const IROHA_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  imageVersion: "2021-08-16--1183",
  imageName: "ghcr.io/hyperledger/cactus-iroha-all-in-one",
  adminPriv: " ",
  adminPub: " ",
  nodePriv: " ",
  nodePub: " ",
  tlsCert: " ",
  tlsKey: " ",
  rpcToriiPort: 50051,
  toriiTlsPort: 55552,
  envVars: [
    "IROHA_POSTGRES_USER=postgres",
    "IROHA_POSTGRES_PASSWORD=my-secret-password",
    "KEY=node0",
  ],
});

/*
 * Provides validations for Iroha container's options
 */
export const IROHA_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    adminPriv: Joi.string().min(1).max(64).required(),
    adminPub: Joi.string().min(1).max(64).required(),
    nodePriv: Joi.string().min(1).max(64).required(),
    nodePub: Joi.string().min(1).max(64).required(),
    tlsCert: Joi.string().min(1).required(),
    tlsKey: Joi.string().min(1).required(),
    toriiTlsPort: Joi.number().port().required(),
    postgresPort: Joi.number().port().required(),
    postgresHost: Joi.string().hostname().required(),
    imageVersion: Joi.string().min(5).required(),
    imageName: Joi.string().min(1).required(),
    rpcToriiPort: Joi.number().port().required(),
    envVars: Joi.array().allow(null).required(),
  },
);

export class IrohaTestLedger implements ITestLedger {
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly rpcToriiPort: number;
  public readonly envVars: string[];
  public readonly emitContainerLogs: boolean;
  public readonly postgresHost: string;
  public readonly postgresPort: number;
  public readonly adminPriv: string;
  public readonly adminPub: string;
  public readonly nodePriv: string;
  public readonly nodePub: string;
  public readonly tlsCert?: string;
  public readonly tlsKey?: string;
  public readonly toriiTlsPort?: number;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly options: IIrohaTestLedgerOptions) {
    const fnTag = `IrohaTestLedger#constructor()`;
    if (!options) {
      throw new TypeError(`IrohaTestLedger#ctor options was falsy.`);
    }
    Checks.nonBlankString(options.postgresHost, `${fnTag} postgresHost`);
    Checks.truthy(options.postgresPort, `${fnTag} postgresPort`);

    this.postgresHost = options.postgresHost;
    this.postgresPort = options.postgresPort;
    this.adminPriv =
      options.adminPriv || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.adminPriv;
    this.adminPub =
      options.adminPub || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.adminPub;
    this.nodePriv =
      options.nodePriv || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.nodePriv;
    this.nodePub = options.nodePub || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.nodePub;

    this.imageVersion =
      options.imageVersion || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.imageVersion;
    this.imageName =
      options.imageName || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.imageName;
    this.rpcToriiPort =
      options.rpcToriiPort || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.rpcToriiPort;
    this.envVars = options.envVars || [
      ...IROHA_TEST_LEDGER_DEFAULT_OPTIONS.envVars,
    ];
    this.tlsCert = options.tlsCert || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.tlsCert;
    this.tlsKey = options.tlsKey || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.tlsKey;
    this.toriiTlsPort =
      options.toriiTlsPort || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.toriiTlsPort;

    this.envVars.push(`IROHA_POSTGRES_HOST=${this.postgresHost}`);
    this.envVars.push(`IROHA_POSTGRES_PORT=${this.postgresPort}`);
    this.envVars.push(`ADMIN_PRIV=${this.adminPriv}`);
    this.envVars.push(`ADMIN_PUB=${this.adminPub}`);
    this.envVars.push(`NODE_PRIV=${this.nodePriv}`);
    this.envVars.push(`NODE_PUB=${this.nodePub}`);

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

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

  public get imageFqn(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public async getRpcToriiPortHost(): Promise<string> {
    const ipAddress = "127.0.0.1";
    const hostPort: number = await this.getRpcToriiPort();
    return `http://${ipAddress}:${hostPort}`;
  }

  /**
   * Output is based on the standard Iroha Torii port number(50051).
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/config.docker
   */
  public getDefaultToriiPort(): number {
    return 50051;
  }

  /**
   * Output is based on the standard Iroha genesis.block content.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public getInternalAddr(): string {
    return "127.0.0.1:10001";
  }

  /**
   * Output is based on the standard Iroha genesis.block content.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public getDefaultAdminAccount(): string {
    return "admin";
  }

  /**
   * Output is based on the standard Iroha genesis.block content.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public getDefaultDomain(): string {
    return "test";
  }

  /**
   * Output is based on the standard Iroha admin user public key file location.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/admin%40test.pub
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public async getGenesisAccountPubKey(): Promise<string> {
    const fnTag = `IrohaTestLedger#getGenesisAccountPubKey()`;
    if (!this.container) {
      throw new Error(`${fnTag} this.container cannot be falsy.`);
    }
    const publicKey = await Containers.pullFile(
      this.container,
      "/opt/iroha_data/admin@test.pub",
    );
    return publicKey;
  }

  /**
   * Output is based on the standard Iroha admin user private key file location.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/admin%40test.priv
   */
  public async getGenesisAccountPrivKey(): Promise<string> {
    const fnTag = `IrohaTestLedger#getGenesisAccountPrivKey()`;
    if (!this.container) {
      throw new Error(`${fnTag} this.container cannot be falsy.`);
    }
    const privateKey = await Containers.pullFile(
      this.container,
      "/opt/iroha_data/admin@test.priv",
    );
    return privateKey;
  }

  /**
   * Output is based on the standard Iroha node private/public keypair file location.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/node0.priv
   * @see https://github.com/hyperledger/iroha/blob/main/example/test%40test.pub
   */
  public async getNodeKeyPair(): Promise<IKeyPair> {
    const fnTag = `IrohaTestLedger#getNodeKeyPair()`;
    if (!this.container) {
      throw new Error(`${fnTag} this.container cannot be falsy.`);
    }
    const publicKey = await Containers.pullFile(
      this.container,
      "/opt/iroha_data/node0.pub",
    );
    const privateKey = await Containers.pullFile(
      this.container,
      "/opt/iroha_data/node0.priv",
    );
    return { publicKey, privateKey };
  }

  public async start(omitPull = false): Promise<Container> {
    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();
    if (!omitPull) {
      this.log.debug(`Pulling container image ${this.imageFqn} ...`);
      await Containers.pullImage(this.imageFqn, {}, this.options.logLevel);
      this.log.debug(`Pulled ${this.imageFqn} OK. Starting container...`);
    }

    return new Promise<Container>((resolve, reject) => {
      const admin = this.getDefaultAdminAccount();
      const domain = this.getDefaultDomain();
      const adminID = `${admin}@${domain}`;
      const toriiPort = this.getDefaultToriiPort();
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            [`${this.rpcToriiPort}/tcp`]: {}, // Iroha RPC - Torii
          },
          Env: this.envVars,
          Healthcheck: {
            //Healthcheck script usage: python3 /healthcheck.py userID toriiPort
            Test: [
              "CMD-SHELL",
              `python3 /healthcheck.py ${adminID} ${toriiPort}`,
            ],
            Interval: 1000000000, // 1 second
            Timeout: 3000000000, // 3 seconds
            Retries: 299,
            StartPeriod: 3000000000, // 3 seconds
          },
          HostConfig: {
            PublishAllPorts: true,
            AutoRemove: true,
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

        if (this.emitContainerLogs) {
          const fnTag = `[${this.imageFqn}]`;
          await Containers.streamLogs({
            container: this.container,
            tag: fnTag,
            log: this.log,
          });
        }

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

  public stop(): Promise<unknown> {
    return Containers.stop(this.container as Container);
  }

  public destroy(): Promise<unknown> {
    const fnTag = "IrohaTestLedger#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const image = this.imageFqn;
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

  /**
   * Return the randomly allocated Iroha Torii port number
   */
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
      throw new Error(`${fnTag} cannot find image: ${this.imageName}`);
    }
  }

  private validateConstructorOptions(): void {
    const validationResult = IROHA_TEST_LEDGER_OPTIONS_JOI_SCHEMA.validate({
      adminPriv: this.adminPriv,
      adminPub: this.adminPub,
      nodePriv: this.nodePriv,
      nodePub: this.nodePub,
      tlsCert: this.tlsCert,
      tlsKey: this.tlsKey,
      toriiTlsPort: this.toriiTlsPort,
      postgresHost: this.postgresHost,
      postgresPort: this.postgresPort,
      imageVersion: this.imageVersion,
      imageName: this.imageName,
      rpcToriiPort: this.rpcToriiPort,
      envVars: this.envVars,
    });

    if (validationResult.error) {
      throw new Error(
        `IrohaTestLedger#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
