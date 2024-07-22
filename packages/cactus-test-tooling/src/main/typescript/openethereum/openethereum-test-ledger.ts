import { EventEmitter } from "events";
import Docker, { Container } from "dockerode";
import { v4 as internalIpV4 } from "internal-ip";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { Account, TransactionReceipt } from "web3-core";
import { v4 as uuidv4 } from "uuid";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";

import { Containers } from "../common/containers";
import { RuntimeError } from "run-time-error-cjs";

export interface IOpenEthereumTestLedgerOptions {
  envVars?: string[];
  imageVersion?: string;
  imageName?: string;
  chainId?: string;
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
  chain?: string;
  httpPort?: number;
  wsPort?: number;
}

export const K_DEFAULT_OPEN_ETHEREUM_IMAGE_NAME = "openethereum/openethereum";
export const K_DEFAULT_OPEN_ETHEREUM_IMAGE_VERSION = "v3.2.4";
export const K_DEFAULT_OPEN_ETHEREUM_HTTP_PORT = 8545;
export const K_DEFAULT_OPEN_ETHEREUM_WS_PORT = 8546;
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
  private readonly wsPort: number;
  private _container: Container | undefined;
  private _containerId: string | undefined;
  private _web3: Web3 | undefined;

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

  private get web3(): Web3 {
    if (this._web3) {
      return this._web3;
    } else {
      throw new Error(
        "Invalid state: web3 client is missing, start the ledger container first.",
      );
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
    this.wsPort = this.options.wsPort || K_DEFAULT_OPEN_ETHEREUM_WS_PORT;
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

    const apiUrl = await this.getRpcApiHttpHost("127.0.0.1", this.httpPort);
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
      "--jsonrpc-apis=web3,eth,personal,net,parity",
      "--ws-port=" + this.wsPort,
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
          Healthcheck,
          ExposedPorts: {
            [`${this.httpPort}/tcp`]: {},
            [`${this.wsPort}/tcp`]: {},
          },
          HostConfig: {
            PublishAllPorts: true,
          },
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
          this._web3 = new Web3(await this.getRpcApiHttpHost());
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
   * Uses `web3.eth.accounts.create`
   *
   * @param [seedMoney=10e8] The amount of money to seed the new test account with.
   */
  public async createEthTestAccount(seedMoney = 10e8): Promise<Account> {
    const ethTestAccount = this.web3.eth.accounts.create(uuidv4());

    const receipt = await this.transferAssetFromCoinbase(
      ethTestAccount.address,
      seedMoney,
    );

    if (receipt instanceof Error) {
      throw new RuntimeError("Error in createEthTestAccount", receipt);
    } else {
      return ethTestAccount;
    }
  }

  /**
   * Creates a new personal ethereum account with specified initial money and password.
   *
   * Uses `web3.eth.personal.newAccount`
   *
   * @param seedMoney Initial money to transfer to this account
   * @param password Personal account password
   * @returns New account address
   */
  public async newEthPersonalAccount(
    seedMoney = 10e8,
    password: string,
  ): Promise<string> {
    const account = await this.web3.eth.personal.newAccount(password);

    const receipt = await this.transferAssetFromCoinbase(account, seedMoney);

    if (receipt instanceof Error) {
      throw new RuntimeError("Error in newEthPersonalAccount", receipt);
    } else {
      return account;
    }
  }

  /**
   * Seed `targetAccount` with money from coin base account.
   *
   * @param targetAccount Ethereum account to send money to.
   * @param value Amount of money.
   * @returns Transfer `TransactionReceipt`
   */
  public async transferAssetFromCoinbase(
    targetAccount: string,
    value: number,
  ): Promise<TransactionReceipt> {
    const fnTag = `${this.className}#transferAssetFromCoinbase()`;

    const tx = await this.web3.eth.accounts.signTransaction(
      {
        from: K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
        to: targetAccount,
        value: value,
        gas: 1000000,
      },
      K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
    );

    if (!tx.rawTransaction) {
      throw new Error(`${fnTag} Signing transaction failed, reason unknown.`);
    }

    return await this.web3.eth.sendSignedTransaction(tx.rawTransaction);
  }

  /**
   * Deploy contract from coin base account to the ledger.
   *
   * @param abi - JSON interface of the contract.
   * @param bytecode - Compiled code of the contract.
   * @param args - Contract arguments.
   * @returns Contract deployment `TransactionReceipt`
   */
  public async deployContract(
    abi: AbiItem | AbiItem[],
    bytecode: string,
    args?: any[],
  ): Promise<TransactionReceipt> {
    // Encode ABI
    const contractProxy = new this.web3.eth.Contract(abi);
    const contractTx = contractProxy.deploy({
      data: bytecode,
      arguments: args,
    });

    // Send TX
    const signedTx = await this.web3.eth.accounts.signTransaction(
      {
        from: K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
        data: contractTx.encodeABI(),
        gas: 8000000, // Max possible gas
        nonce: await this.web3.eth.getTransactionCount(
          K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
        ),
      },
      K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
    );

    if (!signedTx.rawTransaction) {
      throw new Error(`Signing transaction failed, reason unknown.`);
    }

    return await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
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

  public async getRpcApiWebSocketHost(
    host?: string,
    port?: number,
  ): Promise<string> {
    const thePort = port || (await this.getHostPortWs());
    const lanIpV4OrUndefined = await internalIpV4();
    const lanAddress = host || lanIpV4OrUndefined || "127.0.0.1"; // best effort...
    return `ws://${lanAddress}:${thePort}`;
  }

  public async stop(): Promise<void> {
    if (this._container) {
      await Containers.stop(this.container);
      this._web3 = undefined;
    }
  }

  public destroy(): Promise<void> {
    const fnTag = `${this.className}#destroy()`;
    if (this._container) {
      this._web3 = undefined;
      return this._container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  private async getHostPort(port: number): Promise<number> {
    const fnTag = `${this.className}#getHostPort()`;
    if (this._containerId) {
      const cInfo = await Containers.getById(this._containerId);
      return Containers.getPublicPort(port, cInfo);
    } else {
      throw new Error(`${fnTag} Container ID not set. Did you call start()?`);
    }
  }

  public async getHostPortHttp(): Promise<number> {
    return this.getHostPort(this.httpPort);
  }

  public async getHostPortWs(): Promise<number> {
    return this.getHostPort(this.wsPort);
  }
}
