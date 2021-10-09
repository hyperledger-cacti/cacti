import { EventEmitter } from "events";
import Docker, { Container } from "dockerode";
import { v4 as internalIpV4 } from "internal-ip";
import Web3 from "web3";
import { Account } from "web3-core";
import { v4 as uuidv4 } from "uuid";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";

import { Containers } from "../common/containers";

export interface IOpenEthereumTestLedgerOptions {
  envVars?: string[];
  imageVersion?: string;
  imageName?: string;
  chainId?: string;
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
  chain?: string;
  httpPort?: number;
}

export const K_DEFAULT_OPEN_ETHEREUM_IMAGE_NAME = "openethereum/openethereum";
export const K_DEFAULT_OPEN_ETHEREUM_IMAGE_VERSION = "v3.2.4";
export const K_DEFAULT_OPEN_ETHEREUM_HTTP_PORT = 8545;
// @see https://openethereum.github.io/Chain-specification
// @see https://github.com/openethereum/openethereum/tree/main/crates/ethcore/res/chainspec
export const K_DEFAULT_OPEN_ETHEREUM_CHAIN = "dev";

// @see https://openethereum.github.io/Private-development-chain
export const K_DEV_WHALE_ACCOUNT_PRIVATE_KEY =
  "4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";
export const K_DEV_WHALE_ACCOUNT_PUBLIC_KEY =
  "00a329c0648769a73afac7f9381e08fb43dbea72";

/**
 * Class responsible for programmatically managing a container that is running
 * the image made for hosting a keycloak instance which can be used to test
 * authorization/authentication related use-cases.
 */
export class OpenEthereumTestLedger {
  public static readonly CLASS_NAME = "OpenEthereumTestLedger";
  private readonly log: Logger;
  private readonly imageName: string;
  private readonly imageVersion: string;
  private readonly envVars: string[];
  private readonly emitContainerLogs: boolean;
  private readonly chain: string;
  private readonly httpPort: number;
  private _container: Container | undefined;
  private _containerId: string | undefined;

  public get imageFqn(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public get className(): string {
    return OpenEthereumTestLedger.CLASS_NAME;
  }

  public get container(): Container {
    if (this._container) {
      return this._container;
    } else {
      throw new Error(`Invalid state: _container is not set. Called start()?`);
    }
  }

  constructor(public readonly options: IOpenEthereumTestLedgerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this.chain = this.options.chain || K_DEFAULT_OPEN_ETHEREUM_CHAIN;
    this.httpPort = this.options.httpPort || K_DEFAULT_OPEN_ETHEREUM_HTTP_PORT;
    this.imageName =
      this.options.imageName || K_DEFAULT_OPEN_ETHEREUM_IMAGE_NAME;
    this.imageVersion =
      this.options.imageVersion || K_DEFAULT_OPEN_ETHEREUM_IMAGE_VERSION;
    this.envVars = this.options.envVars || [];

    this.log.info(`Created ${this.className} OK. Image FQN: ${this.imageFqn}`);
  }

  public async start(): Promise<Container> {
    if (this._container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    await Containers.pullImage(this.imageFqn, {}, this.options.logLevel);

    const Env = [...[], ...this.envVars];
    this.log.debug(`Effective Env of container: %o`, Env);

    const apiUrl = await this.getRpcApiHttpHost("localhost", this.httpPort);
    const Healthcheck = {
      Test: ["CMD-SHELL", `curl -v '${apiUrl}'`],
      Interval: 1000000000, // 1 second
      Timeout: 3000000000, // 3 seconds
      Retries: 99,
      StartPeriod: 1000000000, // 1 second
    };

    const cmd = [
      "--chain=" + this.chain,
      "--no-persistent-txqueue", // Don't save pending local transactions to disk to be restored whenever the node restarts.
      "--jsonrpc-port=" + this.httpPort,
      "--jsonrpc-cors=all",
      "--jsonrpc-interface=all",
      "--jsonrpc-hosts=all",
      "--jsonrpc-apis=web3,eth,net,parity",
      "--ws-interface=all",
      "--ws-apis=web3,eth,net,parity,pubsub",
      "--ws-origins=all",
      "--ws-hosts=all",
      "--ws-max-connections=10",
      "--max-peers=100",
    ];

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [...cmd],
        [],
        {
          Env,
          PublishAllPorts: true,
          Healthcheck,
        },
        {},
        (err?: Error) => {
          if (err) {
            this.log.error(`Failed to start ${this.imageFqn} container; `, err);
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this._container = container;
        this._containerId = container.id;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.imageFqn}]`;
          await Containers.streamLogs({
            container: this.container,
            tag: fnTag,
            log: this.log,
          });
        }

        try {
          await Containers.waitForHealthCheck(this._containerId);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  /**
   * Creates a new ETH account from scratch on the ledger and then sends it a
   * little seed money to get things started.
   *
   * @param [seedMoney=10e8] The amount of money to seed the new test account with.
   */
  public async createEthTestAccount(seedMoney = 10e8): Promise<Account> {
    const fnTag = `${this.className}#getEthTestAccount()`;

    const rpcApiHttpHost = await this.getRpcApiHttpHost();
    const web3 = new Web3(rpcApiHttpHost);
    const ethTestAccount = web3.eth.accounts.create(uuidv4());

    const tx = await web3.eth.accounts.signTransaction(
      {
        from: K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
        to: ethTestAccount.address,
        value: seedMoney,
        gas: 1000000,
      },
      K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
    );

    if (!tx.rawTransaction) {
      throw new Error(`${fnTag} Signing transaction failed, reason unknown.`);
    }

    const receipt = await web3.eth.sendSignedTransaction(tx.rawTransaction);

    if (receipt instanceof Error) {
      throw receipt;
    } else {
      return ethTestAccount;
    }
  }

  public async getRpcApiHttpHost(
    host?: string,
    port?: number,
  ): Promise<string> {
    const thePort = port || (await this.getHostPortHttp());
    const lanIpV4OrUndefined = await internalIpV4();
    const lanAddress = host || lanIpV4OrUndefined || "127.0.0.1"; // best effort...
    return `http://${lanAddress}:${thePort}`;
  }

  public async stop(): Promise<void> {
    if (this._container) {
      await Containers.stop(this.container);
    }
  }

  public destroy(): Promise<void> {
    const fnTag = `${this.className}#destroy()`;
    if (this._container) {
      return this._container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  public async getHostPortHttp(): Promise<number> {
    const fnTag = `${this.className}#getHostPortHttp()`;
    if (this._containerId) {
      const cInfo = await Containers.getById(this._containerId);
      return Containers.getPublicPort(this.httpPort, cInfo);
    } else {
      throw new Error(`${fnTag} Container ID not set. Did you call start()?`);
    }
  }
}
