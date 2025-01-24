import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  EthContractInvocationType as BesuContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredentialType as Web3SigningCredentialTypeBesu,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { Account } from "web3-core";
import Web3 from "web3";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { randomUUID as uuidv4 } from "node:crypto";
import { BesuConfig } from "../../../main/typescript/types/blockchain-interaction";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { expect } from "@jest/globals";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Asset } from "../../../main/typescript";
import BesuSATPInteraction from "../../solidity/satp-erc20-interact.json";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { NetworkId } from "../../../main/typescript/network-identification/chainid-list";
// import { v4 as internalIpV4 } from "internal-ip";

// currently not used due to GatewayRunner being in NetworkMode: "host"
// const lanIp = await internalIpV4();
// if (!lanIp) {
//   throw new Error(`LAN IP falsy. internal-ip package failed.`);
// }

// Test environment for Besu ledger operations
export class BesuTestEnvironment {
  public static readonly BESU_ASSET_ID: string = uuidv4();
  public static readonly BESU_NETWORK_ID: string = "BESU";
  public readonly network: NetworkId = {
    id: BesuTestEnvironment.BESU_NETWORK_ID,
    ledgerType: LedgerType.Besu2X,
  };
  public ledger!: BesuTestLedger;
  public connector!: PluginLedgerConnectorBesu;
  public connectorOptions!: IPluginLedgerConnectorBesuOptions;
  public bungeeOptions!: IPluginBungeeHermesOptions;
  public keychainPlugin1!: PluginKeychainMemory;
  public keychainPlugin2!: PluginKeychainMemory;
  public besuKeyPair!: { privateKey: string };
  public keychainEntryKey!: string;
  public keychainEntryValue!: string;
  public web3!: Web3;
  public firstHighNetWorthAccount!: string;
  public bridgeEthAccount!: Account;
  public assigneeEthAccount!: Account;
  public erc20TokenContract!: string;
  public contractNameWrapper!: string;
  public assetContractAddress!: string;
  public wrapperContractAddress!: string;
  public besuConfig!: BesuConfig;

  private readonly log: Logger;

  private constructor(
    erc20TokenContract: string,
    contractNameWrapper: string,
    logLevel: LogLevelDesc,
  ) {
    this.erc20TokenContract = erc20TokenContract;
    this.contractNameWrapper = contractNameWrapper;

    const level = logLevel || "INFO";
    const label = "BesuTestEnvironment";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  // Initializes the Besu ledger, accounts, and connector for testing
  public async init(logLevel: LogLevelDesc): Promise<void> {
    this.ledger = new BesuTestLedger({
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
    });
    await this.ledger.start();

    const rpcApiHttpHost = await this.ledger.getRpcApiHttpHost();
    // rpcApiHttpHost = rpcApiHttpHost.replace("127.0.0.1", lanIp);
    const rpcApiWsHost = await this.ledger.getRpcApiWsHost();
    // rpcApiWsHost = rpcApiWsHost.replace("127.0.0.1", lanIp);
    this.web3 = new Web3(rpcApiHttpHost);

    // Accounts setup
    this.firstHighNetWorthAccount = this.ledger.getGenesisAccountPubKey();
    this.bridgeEthAccount = await this.ledger.createEthTestAccount();
    this.assigneeEthAccount = await this.ledger.createEthTestAccount();

    // Besu Key Pair setup
    this.besuKeyPair = { privateKey: this.ledger.getGenesisAccountPrivKey() };
    this.keychainEntryValue = this.besuKeyPair.privateKey;
    this.keychainEntryKey = uuidv4();

    // Keychain Plugins setup
    this.keychainPlugin1 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      backend: new Map([[this.keychainEntryKey, this.keychainEntryValue]]),
      logLevel,
    });

    this.keychainPlugin2 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      backend: new Map([[this.keychainEntryKey, this.keychainEntryValue]]),
      logLevel,
    });

    // Smart Contract Configuration
    this.keychainPlugin1.set(
      this.erc20TokenContract,
      JSON.stringify(SATPContract),
    );
    this.keychainPlugin2.set(
      this.contractNameWrapper,
      JSON.stringify(SATPWrapperContract),
    );

    // Plugin Registry setup
    const pluginRegistry = new PluginRegistry({
      plugins: [this.keychainPlugin1, this.keychainPlugin2],
    });

    // Besu Connector setup
    this.connectorOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };

    this.connector = new PluginLedgerConnectorBesu(this.connectorOptions);

    await this.connector.transact({
      web3SigningCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: this.firstHighNetWorthAccount,
        to: this.bridgeEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
    });

    const balance = await this.web3.eth.getBalance(
      this.bridgeEthAccount.address,
    );
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toBeGreaterThan(10e9);
    this.log.info(`Bridge account funded: New Balance: ${balance} wei`);
  }

  // Creates and initializes a new BesuTestEnvironment instance
  public static async setupTestEnvironment(
    erc20TokenContract: string,
    contractNameWrapper: string,
    logLevel: LogLevelDesc,
  ): Promise<BesuTestEnvironment> {
    const instance = new BesuTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    await instance.init(logLevel);
    return instance;
  }

  // Generates the Besu configuration for use in SATP Gateway Docker container
  public async createBesuConfigJSON(
    logLevel?: LogLevelDesc,
  ): Promise<Record<string, unknown>> {
    return {
      network: this.besuConfig.network,
      keychainId: this.besuConfig.keychainId,
      signingCredential: this.besuConfig.signingCredential,
      contractName: this.besuConfig.contractName,
      contractAddress: this.besuConfig.contractAddress,
      gas: this.besuConfig.gas,
      options: {
        instanceId: this.connectorOptions.instanceId,
        rpcApiHttpHost: this.connectorOptions.rpcApiHttpHost,
        rpcApiWsHost: this.connectorOptions.rpcApiWsHost,
        pluginRegistryOptions: {
          plugins: [
            {
              instanceId: this.keychainPlugin1.getInstanceId(),
              keychainId: this.keychainPlugin1.getKeychainId(),
              logLevel,
              backend: [
                {
                  keychainEntry: this.keychainEntryKey,
                  keychainEntryValue: this.keychainEntryValue,
                },
              ],
              contractName: this.erc20TokenContract,
              contractString: await this.keychainPlugin1.get(
                this.erc20TokenContract,
              ),
            },
            {
              instanceId: this.keychainPlugin2.getInstanceId(),
              keychainId: this.keychainPlugin2.getKeychainId(),
              logLevel,
              backend: [
                {
                  keychainEntry: this.keychainEntryKey,
                  keychainEntryValue: this.keychainEntryValue,
                },
              ],
              contractName: this.contractNameWrapper,
              contractString: await this.keychainPlugin2.get(
                this.contractNameWrapper,
              ),
            },
          ],
        },
        logLevel: this.connectorOptions.logLevel,
      },
      bungeeOptions: {
        keyPair: {
          privateKey: Buffer.from(
            this.bungeeOptions.keyPair!.privateKey.buffer,
          ).toString("hex"),
          publicKey: Buffer.from(
            this.bungeeOptions.keyPair!.publicKey.buffer,
          ).toString("hex"),
        },
        instanceId: this.bungeeOptions.instanceId,
        logLevel: this.bungeeOptions.logLevel,
      },
      claimFormat: this.besuConfig.claimFormat,
    };
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupContracts(claimFormat: ClaimFormat) {
    const deployOutSATPContract = await this.connector.deployContract({
      keychainId: this.keychainPlugin1.getKeychainId(),
      contractName: this.erc20TokenContract,
      contractAbi: SATPContract.abi,
      constructorArgs: [
        this.firstHighNetWorthAccount,
        BesuTestEnvironment.BESU_ASSET_ID,
      ],
      web3SigningCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      bytecode: SATPContract.bytecode.object,
      gas: 999999999999999,
    });
    expect(deployOutSATPContract).toBeTruthy();
    expect(deployOutSATPContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutSATPContract.transactionReceipt.contractAddress,
    ).toBeTruthy();

    this.assetContractAddress =
      deployOutSATPContract.transactionReceipt.contractAddress ?? "";

    this.log.info("SATPContract Deployed successfully");

    const deployOutWrapperContract = await this.connector.deployContract({
      keychainId: this.keychainPlugin2.getKeychainId(),
      contractName: this.contractNameWrapper,
      contractAbi: SATPWrapperContract.abi,
      constructorArgs: [this.bridgeEthAccount.address],
      web3SigningCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      bytecode: SATPWrapperContract.bytecode.object,
      gas: 999999999999999,
    });
    expect(deployOutWrapperContract).toBeTruthy();
    expect(deployOutWrapperContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutWrapperContract.transactionReceipt.contractAddress,
    ).toBeTruthy();
    this.log.info("SATPWrapperContract Deployed successfully");

    this.wrapperContractAddress =
      deployOutWrapperContract.transactionReceipt.contractAddress ?? "";

    this.bungeeOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
    };

    this.besuConfig = {
      network: this.network,
      keychainId: this.keychainPlugin2.getKeychainId(),
      signingCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      contractName: this.contractNameWrapper,
      contractAddress: this.wrapperContractAddress,
      options: this.connectorOptions,
      bungeeOptions: this.bungeeOptions,
      gas: 999999999999999,
      claimFormat: claimFormat,
    };

    const giveRoleRes = await this.connector.invokeContract({
      contractName: this.erc20TokenContract,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "giveRole",
      params: [this.wrapperContractAddress],
      signingCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    this.log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");

    const responseMint = await this.connector.invokeContract({
      contractName: this.erc20TokenContract,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "mint",
      params: [this.firstHighNetWorthAccount, "100"],
      signingCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseMint).toBeTruthy();
    expect(responseMint.success).toBeTruthy();
    this.log.info("Minted 100 tokens to firstHighNetWorthAccount");

    const responseApprove = await this.connector.invokeContract({
      contractName: this.erc20TokenContract,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "approve",
      params: [this.wrapperContractAddress, "100"],
      signingCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseApprove).toBeTruthy();
    expect(responseApprove.success).toBeTruthy();
    this.log.info("Approved 100 tokens to SATPWrapperContract");
  }

  // Gets the default asset configuration for testing
  public get defaultAsset(): Asset {
    return {
      owner: this.firstHighNetWorthAccount,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: this.erc20TokenContract,
      contractAddress: this.assetContractAddress,
    };
  }

  // Returns the assignee account address used for testing transactions
  get transactRequestPubKey(): string {
    return this.assigneeEthAccount.address;
  }

  // Stops and destroys the test ledger
  public async tearDown(): Promise<void> {
    await this.ledger.stop();
    await this.ledger.destroy();
  }
}
