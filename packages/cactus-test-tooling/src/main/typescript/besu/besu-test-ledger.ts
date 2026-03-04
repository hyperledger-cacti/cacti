import { v4 as uuidv4 } from "uuid";
import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import tar from "tar-stream";
import { EventEmitter } from "events";
import Web3 from "web3";
import { Account, TransactionReceipt } from "web3-core";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Streams } from "../common/streams";
import { IKeyPair } from "../i-key-pair";
import { Containers } from "../common/containers";

export interface IBesuTestLedgerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  rpcApiHttpPort?: number;
  rpcApiWsPort?: number;
  envVars?: string[];
  commands?: string[];
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
  networkName?: string;
}

export const BESU_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "v2.2.0-rc.2",
  containerImageName: "ghcr.io/hyperledger-cacti/besu-all-in-one",
  rpcApiHttpPort: 8545,
  rpcApiWsPort: 8546,
  envVars: ["BESU_NETWORK=dev"],
  networkName: "cactus-besu-test-network",
});

export const BESU_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema =
  Joi.object().keys({
    containerImageVersion: Joi.string().min(5).required(),
    containerImageName: Joi.string().min(1).required(),
    rpcApiHttpPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
    envVars: Joi.array().allow(null).required(),
  });

export class BesuTestLedger implements ITestLedger {
  public static readonly CLASS_NAME = "BesuTestLedger";
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly rpcApiHttpPort: number;
  public readonly rpcApiWsPort: number;
  public readonly envVars: string[];
  public readonly commands: string[];
  public readonly emitContainerLogs: boolean;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  private readonly networkName: string;

  constructor(public readonly options: IBesuTestLedgerConstructorOptions = {}) {
    if (!options) {
      throw new TypeError(
        `${BesuTestLedger.CLASS_NAME}#constructor options was falsy.`,
      );
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      BESU_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      BESU_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;
    this.rpcApiHttpPort =
      options.rpcApiHttpPort || BESU_TEST_LEDGER_DEFAULT_OPTIONS.rpcApiHttpPort;
    this.rpcApiWsPort =
      options.rpcApiWsPort || BESU_TEST_LEDGER_DEFAULT_OPTIONS.rpcApiWsPort;
    this.envVars = options.envVars || BESU_TEST_LEDGER_DEFAULT_OPTIONS.envVars;
    this.networkName =
      options.networkName || BESU_TEST_LEDGER_DEFAULT_OPTIONS.networkName;

    this.commands = options.commands || [];

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this.validateConstructorOptions();
    const label = "besu-test-ledger";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "BesuTestLedger#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getRpcApiHttpHost(asLocalhost: boolean = true): Promise<string> {
    if (asLocalhost) {
      const ipAddress = "127.0.0.1";
      const hostPort: number = await this.getRpcApiPublicPort();
      return `http://${ipAddress}:${hostPort}`;
    } else {
      const hostIp: string = await this.getContainerIpAddress();
      return `http://${hostIp}:${this.rpcApiHttpPort}`;
    }
  }

  public async getRpcApiWsHost(asLocalhost: boolean = true): Promise<string> {
    if (asLocalhost) {
      const { rpcApiWsPort } = this;
      const ipAddress = "127.0.0.1";
      const containerInfo = await this.getContainerInfo();
      const port = await Containers.getPublicPort(rpcApiWsPort, containerInfo);
      return `ws://${ipAddress}:${port}`;
    } else {
      const hostIp: string = await this.getContainerIpAddress();
      return `ws://${hostIp}:${this.rpcApiWsPort}`;
    }
  }

  public async getFileContents(filePath: string): Promise<string> {
    const response = await this.getContainer().getArchive({
      path: filePath,
    });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents = "";
      extract.on("entry", async (header: unknown, stream, next) => {
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
   * Output is based on the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  public getGenesisAccountPubKey(): string {
    return "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  }

  /**
   * Output is based on the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  public getGenesisAccountPrivKey(): string {
    return "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3";
  }

  /**
   * Creates a new ETH account from scratch on the ledger and then sends it a
   * little seed money to get things started.
   *
   * @param [seedMoney=10e8] The amount of money to seed the new test account with.
   */
  public async createEthTestAccount(seedMoney = 10e8): Promise<Account> {
    const rpcApiHttpHost = await this.getRpcApiHttpHost();
    const web3 = new Web3(rpcApiHttpHost);
    const ethTestAccount = web3.eth.accounts.create(uuidv4());

    await this.sendEthToAccount(ethTestAccount.address, seedMoney);

    return ethTestAccount;
  }

  /**
   * Sends seed money to a provided address to get things started.
   *
   * @param [seedMoney=10e8] The amount of money to seed the new test account with.
   */
  public async sendEthToAccount(
    address: string,
    seedMoney = 10e8,
  ): Promise<TransactionReceipt> {
    const fnTag = `BesuTestLedger#sendEthToAccount()`;

    const rpcApiHttpHost = await this.getRpcApiHttpHost();
    const web3 = new Web3(rpcApiHttpHost);

    const tx = await web3.eth.accounts.signTransaction(
      {
        from: this.getGenesisAccountPubKey(),
        to: address,
        value: seedMoney,
        gas: 1000000,
      },
      this.getGenesisAccountPrivKey(),
    );

    if (!tx.rawTransaction) {
      throw new Error(`${fnTag} Signing transaction failed, reason unknown.`);
    }

    const receipt = await web3.eth.sendSignedTransaction(tx.rawTransaction);

    if (receipt instanceof Error) {
      throw receipt;
    }
    return receipt;
  }

  // Get Besu key pair for Besu v21, this besu version does not have the genesis.json file
  public async getV21BesuKeyPair(): Promise<IKeyPair> {
    const publicKey = await this.getFileContents("/opt/besu/keys/key.pub");
    const privateKey = await this.getFileContents("/opt/besu/keys/key");
    return { publicKey, privateKey };
  }

  public async getBesuKeyPair(
    opts: { genesisAllocIdx: number } = { genesisAllocIdx: 1 },
  ): Promise<IKeyPair> {
    const fn = `BesuTestLedger#getBesuKeyPair()`;
    const genesisFile = await this.getFileContents("/opt/besu/genesis.json");
    const { genesisAllocIdx: idx } = opts;
    const { alloc } = JSON.parse(genesisFile);

    const keyPair = Object.entries(alloc).find((_, i) => i === idx);

    if (!keyPair) {
      throw new Error(`${fn} genesis alloc missing entry with idx: ${idx}`);
    }
    const [pubKey, keyData] = keyPair;

    const publicKey = pubKey.startsWith("0x") ? pubKey : `0x${pubKey}`;
    if (!keyData || typeof keyData !== "object" || !("privateKey" in keyData)) {
      throw new Error(`${fn} invalid key data within genesis alloc`);
    }

    const { privateKey } = keyData;
    if (typeof privateKey !== "string") {
      throw new Error(`${fn} invalid genesis alloc: privateKey must be string`);
    }
    const pKey0x = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
    return { publicKey, privateKey: pKey0x };
  }

  // Get Orion key pair for Besu v21, this besu version does not have the genesis.json file
  public async getV21OrionKeyPair(): Promise<IKeyPair> {
    const publicKey = await this.getFileContents("/config/orion/nodeKey.pub");
    const privateKey = await this.getFileContents("/config/orion/nodeKey.key");
    return { publicKey, privateKey };
  }

  public async getOrionKeyPair(): Promise<IKeyPair> {
    return this.getBesuKeyPair({ genesisAllocIdx: 2 });
  }

  public async start(omitPull = false): Promise<Container> {
    const imageFqn = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    if (!omitPull) {
      this.log.debug(`Pulling container image ${imageFqn} ...`);
      await this.pullContainerImage(imageFqn);
      this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);
    }

    if (this.networkName) {
      const networks = await docker.listNetworks();
      const networkExists = networks.some((n) => n.Name === this.networkName);
      if (!networkExists) {
        await docker.createNetwork({
          Name: this.networkName,
          Driver: "bridge",
        });
      }
    }

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            [`${this.rpcApiHttpPort}/tcp`]: {}, // besu RPC - HTTP
            [`${this.rpcApiWsPort}/tcp`]: {}, // besu RPC - WebSocket
            "8888/tcp": {}, // orion Client Port - HTTP
            "8080/tcp": {}, // orion Node Port - HTTP
            "9001/tcp": {}, // supervisord - HTTP
            "9545/tcp": {}, // besu metrics
          },
          // TODO: this can be removed once the new docker image is published and
          // specified as the default one to be used by the tests.
          Healthcheck: {
            Test: [
              "CMD-SHELL",
              `curl -X POST --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 127.0.0.1:8545`,
            ],
            Interval: 1000000000, // 1 second
            Timeout: 3000000000, // 3 seconds
            Retries: 299,
            StartPeriod: 3000000000, // 1 second
          },
          HostConfig: {
            PublishAllPorts: true,
            NetworkMode: this.networkName,
          },
          Env: this.envVars,
          Cmd: this.commands,
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
          const fnTag = `[${this.getContainerImageName()}]`;
          await Containers.streamLogs({
            container: this.getContainer(),
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

  public async waitForHealthCheck(timeoutMs = 360000): Promise<void> {
    const fnTag = "BesuTestLedger#waitForHealthCheck()";
    const startedAt = Date.now();
    let isHealthy = false;
    do {
      if (Date.now() >= startedAt + timeoutMs) {
        throw new Error(`${fnTag} timed out (${timeoutMs}ms)`);
      }
      const { Status, State } = await this.getContainerInfo();
      this.log.debug(`ContainerInfo.Status=%o, State=O%`, Status, State);
      isHealthy = Status.endsWith("(healthy)");
      if (!isHealthy) {
        await new Promise((resolve2) => setTimeout(resolve2, 1000));
      }
    } while (!isHealthy);
  }

  public stop(): Promise<unknown> {
    const fnTag = "BesuTestLedger#stop()";
    return new Promise((resolve, reject) => {
      if (this.container) {
        this.container.stop({}, (err: unknown, result: unknown) => {
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
  }

  public destroy(): Promise<unknown> {
    const fnTag = "BesuTestLedger#destroy()";
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
      throw new Error(`BesuTestLedger#getContainerInfo() no image "${image}"`);
    }
  }

  public async getRpcApiPublicPort(): Promise<number> {
    const fnTag = "BesuTestLedger#getRpcApiPublicPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { rpcApiHttpPort: thePort } = this;
    const { Ports: ports } = aContainerInfo;

    if (ports.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = ports.find((x) => x.PrivatePort === thePort);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${thePort} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${thePort} mapped to 127.0.0.1`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${thePort}`);
    }
  }

  public async getContainerIpAddress(
    network: string = this.networkName || "bridge",
  ): Promise<string> {
    const fnTag = "BesuTestLedger#getContainerIpAddress()";
    const aContainerInfo = await this.getContainerInfo();

    if (!aContainerInfo) {
      throw new Error(`${fnTag} cannot find image: ${this.containerImageName}`);
    }
    const { NetworkSettings } = aContainerInfo;
    const networkNames: string[] = Object.keys(NetworkSettings.Networks);
    if (networkNames.length < 1) {
      throw new Error(`${fnTag} container not connected to any networks`);
    }

    return NetworkSettings.Networks[network].IPAddress;
  }

  private pullContainerImage(containerNameAndTag: string): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const docker = new Docker();
      docker.pull(containerNameAndTag, (pullError: unknown, stream: never) => {
        if (pullError) {
          reject(pullError);
        } else {
          docker.modem.followProgress(
            stream,
            (progressError: unknown, output: unknown[]) => {
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
    const validationResult = BESU_TEST_LEDGER_OPTIONS_JOI_SCHEMA.validate({
      containerImageVersion: this.containerImageVersion,
      containerImageName: this.containerImageName,
      rpcApiHttpPort: this.rpcApiHttpPort,
      envVars: this.envVars,
    });

    if (validationResult.error) {
      throw new Error(
        `BesuTestLedger#ctor ${validationResult.error.annotate()}`,
      );
    }
  }

  public getNetworkName(): string {
    const fnTag = `${BesuTestLedger.CLASS_NAME}#getNetworkName()`;
    if (this.networkName) {
      return this.networkName;
    }
    throw new Error(`${fnTag} network name not set`);
  }
}
