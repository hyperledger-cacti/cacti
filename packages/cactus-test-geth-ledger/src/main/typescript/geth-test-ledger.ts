import { EventEmitter } from "events";
import Docker, { Container } from "dockerode";
import { v4 as internalIpV4 } from "internal-ip";
import Web3, { ContractAbi, TransactionReceipt } from "web3";
import type { Web3Account } from "web3-eth-accounts";
import { RuntimeError } from "run-time-error-cjs";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { Containers } from "@hyperledger/cactus-test-tooling";

export interface IGethTestLedgerOptions {
  readonly containerImageName?: string;
  readonly containerImageVersion?: string;
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: string[];
  // For test development, attach to ledger that is already running, don't spin up new one
  readonly useRunningLedger?: boolean;
}

/**
 * Default values used by GethTestLedger constructor.
 */
export const GETH_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  containerImageName: "ghcr.io/hyperledger/cacti-geth-all-in-one",
  containerImageVersion: "2023-07-27-2a8c48ed6",
  logLevel: "info" as LogLevelDesc,
  emitContainerLogs: false,
  envVars: [],
  useRunningLedger: false,
});

export const WHALE_ACCOUNT_PRIVATE_KEY =
  "86bbf98cf5e5b1c43d2c8701764897357e0fa24982c0137efabf6dc3a6e7b69e";
export const WHALE_ACCOUNT_ADDRESS =
  "0x6a2ec8c50ba1a9ce47c52d1cb5b7136ee9d0ccc0";

export class GethTestLedger {
  public static readonly CLASS_NAME = "GethTestLedger";
  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly containerImageName: string;
  private readonly containerImageVersion: string;
  private readonly envVars: string[];
  private readonly emitContainerLogs: boolean;
  public readonly useRunningLedger: boolean;
  private _container: Container | undefined;
  private _containerId: string | undefined;
  private _web3: Web3 | undefined;

  public get fullContainerImageName(): string {
    return [this.containerImageName, this.containerImageVersion].join(":");
  }

  public get className(): string {
    return GethTestLedger.CLASS_NAME;
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

  constructor(public readonly options: IGethTestLedgerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.logLevel =
      this.options.logLevel || GETH_TEST_LEDGER_DEFAULT_OPTIONS.logLevel;
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });

    this.emitContainerLogs =
      options?.emitContainerLogs ??
      GETH_TEST_LEDGER_DEFAULT_OPTIONS.emitContainerLogs;
    this.useRunningLedger =
      options?.useRunningLedger ??
      GETH_TEST_LEDGER_DEFAULT_OPTIONS.useRunningLedger;
    this.containerImageName =
      this.options.containerImageName ||
      GETH_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName;
    this.containerImageVersion =
      this.options.containerImageVersion ||
      GETH_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion;
    this.envVars =
      this.options.envVars || GETH_TEST_LEDGER_DEFAULT_OPTIONS.envVars;

    this.log.info(
      `Created ${this.className} OK. Image FQN: ${this.fullContainerImageName}`,
    );
  }

  /**
   * Get container status.
   *
   * @returns status string
   */
  public async getContainerStatus(): Promise<string> {
    if (!this.container) {
      throw new Error(
        "GethTestLedger#getContainerStatus(): Container not started yet!",
      );
    }

    const { Status } = await Containers.getById(this.container.id);
    return Status;
  }

  /**
   * Start a test Geth ledger.
   *
   * @param omitPull Don't pull docker image from upstream if true.
   * @returns Promise<Container>
   */
  public async start(omitPull = false, cmd: string[] = []): Promise<Container> {
    if (this.useRunningLedger) {
      this.log.info(
        "Search for already running Geth Test Ledger because 'useRunningLedger' flag is enabled.",
      );
      this.log.info(
        "Search criteria - image name: ",
        this.fullContainerImageName,
        ", state: running",
      );
      const containerInfo = await Containers.getByPredicate(
        (ci) =>
          ci.Image === this.fullContainerImageName && ci.State === "healthy",
      );
      const docker = new Docker();
      this._container = docker.getContainer(containerInfo.Id);
      return this._container;
    }

    if (this._container) {
      this.log.warn("Container was already running - restarting it...");
      await this.container.stop();
      await this.container.remove();
      this._container = undefined;
    }

    if (!omitPull) {
      await Containers.pullImage(
        this.fullContainerImageName,
        {},
        this.logLevel,
      );
    }

    return new Promise<Container>((resolve, reject) => {
      const docker = new Docker();
      const eventEmitter: EventEmitter = docker.run(
        this.fullContainerImageName,
        cmd,
        [],
        {
          ExposedPorts: {
            ["8545/tcp"]: {},
            ["8546/tcp"]: {},
          },
          Env: this.envVars,
          HostConfig: {
            PublishAllPorts: true,
          },
        },
        {},
        (err?: Error) => {
          if (err) {
            this.log.error(
              `Failed to start ${this.fullContainerImageName} container; `,
              err,
            );
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this._container = container;
        this._containerId = container.id;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.fullContainerImageName}]`;
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
   * Stop a test Geth ledger.
   *
   * @returns Stop operation results.
   */
  public async stop(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info("Ignore stop request because useRunningLedger is enabled.");
      return;
    } else if (this.container) {
      this._web3 = undefined;
      return Containers.stop(this.container);
    } else {
      throw new Error(
        `GethTestLedger#stop() Container was never created, nothing to stop.`,
      );
    }
  }

  /**
   * Destroy a test Geth ledger.
   *
   * @returns Destroy operation results.
   */
  public async destroy(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info(
        "Ignore destroy request because useRunningLedger is enabled.",
      );
      return;
    } else if (this.container) {
      this._web3 = undefined;
      return this.container.remove();
    } else {
      throw new Error(
        `GethTestLedger#destroy() Container was never created, nothing to destroy.`,
      );
    }
  }

  /**
   * Creates a new ETH account from scratch on the ledger and then sends it a
   * little seed money to get things started.
   *
   * Uses `web3.eth.accounts.create`
   *
   * @param [seedMoney=10e18 (1ETH)] The amount of money to seed the new test account with.
   */
  public async createEthTestAccount(seedMoney = 10e18): Promise<Web3Account> {
    const ethTestAccount = this.web3.eth.accounts.create();

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
    seedMoney = 10e18,
    password = "test",
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
        from: WHALE_ACCOUNT_ADDRESS,
        to: targetAccount,
        value: value,
        gasPrice: await this.web3.eth.getGasPrice(),
        gas: 1000000,
      },
      WHALE_ACCOUNT_PRIVATE_KEY,
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
    abi: ContractAbi,
    bytecode: string,
    args?: any[],
  ): Promise<TransactionReceipt> {
    // Encode ABI
    const contractProxy = new this.web3.eth.Contract(abi);
    const contractTx = contractProxy.deploy({
      data: bytecode,
      arguments: args as any,
    });

    // Send TX
    const signedTx = await this.web3.eth.accounts.signTransaction(
      {
        from: WHALE_ACCOUNT_ADDRESS,
        data: contractTx.encodeABI(),
        gasPrice: await this.web3.eth.getGasPrice(),
        gasLimit: 8000000,
        nonce: await this.web3.eth.getTransactionCount(WHALE_ACCOUNT_ADDRESS),
      },
      WHALE_ACCOUNT_PRIVATE_KEY,
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
    return this.getHostPort(8545);
  }

  public async getHostPortWs(): Promise<number> {
    return this.getHostPort(8546);
  }
}
