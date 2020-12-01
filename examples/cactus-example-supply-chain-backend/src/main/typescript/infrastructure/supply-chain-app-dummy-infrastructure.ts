import { Account } from "web3-core";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core-api";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import {
  BesuTestLedger,
  QuorumTestLedger,
} from "@hyperledger/cactus-test-tooling";

import {
  bytecode as BambooHarvestRepositoryBytecode,
  abi as BambooHarvestRepositoryAbi,
} from "../../json/generated/BambooHarvestRepository.json";
import {
  bytecode as BookshelfRepositoryBytecode,
  abi as BookshelfRepositoryAbi,
} from "../../json/generated/BookshelfRepository.json";
import {
  IEthContractDeployment,
  ISupplyChainContractDeploymentInfo,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

export interface ISupplyChainAppDummyInfrastructureOptions {
  logLevel?: LogLevelDesc;
}

/**
 * Contains code that is meant to simulate parts of a production grade deployment
 * that would otherwise not be part of the application itself.
 *
 * The reason for this being in existence is so that we can have tutorials that
 * are self-contained instead of starting with a multi-hour setup process where
 * the user is expected to set up ledgers from scratch with all the bells and
 * whistles.
 * The sole purpose of this is to have people ramp up with Cactus as fast as
 * possible.
 */
export class SupplyChainAppDummyInfrastructure {
  public static readonly CLASS_NAME = "SupplyChainAppDummyInfrastructure";

  public readonly besu: BesuTestLedger;
  public readonly quorum: QuorumTestLedger;
  private readonly log: Logger;
  private _quorumAccount: Account | undefined;
  private _besuAccount: Account | undefined;

  public get quorumAccount() {
    if (!this._quorumAccount) {
      throw new Error(`Must call deployContracts() first.`);
    } else {
      return this._quorumAccount;
    }
  }

  public get besuAccount() {
    if (!this._besuAccount) {
      throw new Error(`Must call deployContracts() first.`);
    } else {
      return this._besuAccount;
    }
  }

  public get className() {
    return SupplyChainAppDummyInfrastructure.CLASS_NAME;
  }

  constructor(
    public readonly options: ISupplyChainAppDummyInfrastructureOptions
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.besu = new BesuTestLedger();
    this.quorum = new QuorumTestLedger();
  }

  public async stop(): Promise<void> {
    try {
      this.log.info(`Stopping...`);
      await Promise.all([
        this.besu.stop().then(() => this.besu.destroy()),

        this.quorum.stop().then(() => this.quorum.destroy()),
      ]);
      this.log.info(`Stopped OK`);
    } catch (ex) {
      this.log.error(`Stopping crashed: `, ex);
      throw ex;
    }
  }

  public async start(): Promise<void> {
    try {
      this.log.info(`Starting dummy infrastructure...`);
      await Promise.all([this.besu.start(), this.quorum.start()]);
      this.log.info(`Started dummy infrastructure OK`);
    } catch (ex) {
      this.log.error(`Starting of dummy infrastructure crashed: `, ex);
      throw ex;
    }
  }

  public async deployContracts(): Promise<ISupplyChainContractDeploymentInfo> {
    try {
      this.log.info(`Deploying smart contracts...`);

      let bambooHarvestRepository: IEthContractDeployment;
      let bookshelfRepository: IEthContractDeployment;

      {
        this._quorumAccount = await this.quorum.createEthTestAccount(2000000);
        const rpcApiHttpHost = await this.quorum.getRpcApiHttpHost();

        const connector = new PluginLedgerConnectorQuorum({
          instanceId: "PluginLedgerConnectorQuorum_Contract_Deployment",
          rpcApiHttpHost,
          logLevel: this.options.logLevel,
          pluginRegistry: new PluginRegistry(),
        });

        const res = await connector.deployContract({
          bytecode: BambooHarvestRepositoryBytecode,
          gas: 1000000,
          web3SigningCredential: {
            ethAccount: this.quorumAccount.address,
            secret: this.quorumAccount.privateKey,
            type: Web3SigningCredentialType.PRIVATEKEYHEX,
          },
        });
        const {
          transactionReceipt: { contractAddress },
        } = res;

        bambooHarvestRepository = {
          abi: BambooHarvestRepositoryAbi,
          address: contractAddress as string,
          bytecode: BambooHarvestRepositoryBytecode,
        };
      }

      {
        this._besuAccount = await this.besu.createEthTestAccount(2000000);
        const rpcApiHttpHost = await this.besu.getRpcApiHttpHost();

        const connector = new PluginLedgerConnectorBesu({
          instanceId: "PluginLedgerConnectorBesu_Contract_Deployment",
          rpcApiHttpHost,
          logLevel: this.options.logLevel,
          pluginRegistry: new PluginRegistry(),
        });

        const res = await connector.deployContract({
          bytecode: BookshelfRepositoryBytecode,
          gas: 1000000,
          web3SigningCredential: {
            ethAccount: this.besuAccount.address,
            secret: this.besuAccount.privateKey,
            type: Web3SigningCredentialType.PRIVATEKEYHEX,
          },
        });
        const {
          transactionReceipt: { contractAddress },
        } = res;

        bookshelfRepository = {
          abi: BookshelfRepositoryAbi,
          address: contractAddress as string,
          bytecode: BookshelfRepositoryBytecode,
        };
      }

      const out: ISupplyChainContractDeploymentInfo = {
        bambooHarvestRepository,
        bookshelfRepository,
      };

      this.log.info(`Deployed smart contracts OK`);

      return out;
    } catch (ex) {
      this.log.error(`Deployment of smart contracts crashed: `, ex);
      throw ex;
    }
  }
}
