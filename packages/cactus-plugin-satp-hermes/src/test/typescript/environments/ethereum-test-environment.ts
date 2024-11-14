import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { randomUUID as uuidv4 } from "node:crypto";
import { EthereumConfig } from "../../../main/typescript/types/blockchain-interaction";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorEthereumOptions,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { expect } from "@jest/globals";
import { SupportedChain } from "../../../main/typescript/core/types";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Asset } from "../../../main/typescript";
import BesuSATPInteraction from "../../solidity/satp-erc20-interact.json";

// Test environment for Ethereum ledger operations
export class EthereumTestEnvironment {
  public static readonly ETH_ASSET_ID: string = uuidv4();

  public readonly network: SupportedChain = SupportedChain.EVM;
  public ledger!: GethTestLedger;
  public connector!: PluginLedgerConnectorEthereum;
  public connectorOptions!: IPluginLedgerConnectorEthereumOptions;
  public bungeeOptions!: IPluginBungeeHermesOptions;
  public keychainPlugin1!: PluginKeychainMemory;
  public keychainPlugin2!: PluginKeychainMemory;
  public keychainEntryKey!: string;
  public keychainEntryValue!: string;
  public bridgeEthAccount!: string;
  public erc20TokenContract!: string;
  public contractNameWrapper!: string;
  public assetContractAddress!: string;
  public wrapperContractAddress!: string;
  public ethereumConfig!: EthereumConfig;

  private readonly log: Logger;

  private constructor(
    erc20TokenContract: string,
    contractNameWrapper: string,
    logLevel: LogLevelDesc,
  ) {
    this.erc20TokenContract = erc20TokenContract;
    this.contractNameWrapper = contractNameWrapper;

    const level = logLevel || "INFO";
    const label = "EthereumTestEnvironment";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  // Initializes the Ethereum ledger, accounts, and connector for testing
  public async init(logLevel: LogLevelDesc): Promise<void> {
    this.ledger = new GethTestLedger({
      containerImageName: "ghcr.io/hyperledger/cacti-geth-all-in-one",
      containerImageVersion: "2023-07-27-2a8c48ed6",
    });
    await this.ledger.start();

    const SATPContract1 = {
      contractName: "SATPContract",
      abi: SATPContract.abi,
      bytecode: SATPContract.bytecode.object,
    };
    const SATPWrapperContract1 = {
      contractName: "SATPWrapperContract",
      abi: SATPWrapperContract.abi,
      bytecode: SATPWrapperContract.bytecode.object,
    };

    const rpcApiHttpHost = await this.ledger.getRpcApiHttpHost();
    this.bridgeEthAccount = await this.ledger.newEthPersonalAccount();
    this.keychainEntryValue = "test";
    this.keychainEntryKey = this.bridgeEthAccount;

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

    this.keychainPlugin1.set(
      this.erc20TokenContract,
      JSON.stringify(SATPContract1),
    );
    this.keychainPlugin2.set(
      this.contractNameWrapper,
      JSON.stringify(SATPWrapperContract1),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [this.keychainPlugin1, this.keychainPlugin2],
    });

    this.connectorOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      pluginRegistry,
      logLevel,
    };

    this.connector = new PluginLedgerConnectorEthereum(this.connectorOptions);
  }

  // Creates and initializes a new EthereumTestEnvironment instance
  public static async setupTestEnvironment(
    erc20TokenContract: string,
    contractNameWrapper: string,
    logLevel: LogLevelDesc,
  ): Promise<EthereumTestEnvironment> {
    const instance = new EthereumTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    await instance.init(logLevel);
    return instance;
  }

  // Generates the Ethereum configuration for use in SATP Gateway Docker container
  public async createEthereumConfigJSON(
    logLevel?: LogLevelDesc,
  ): Promise<Record<string, unknown>> {
    return {
      network: this.ethereumConfig.network,
      keychainId: this.ethereumConfig.keychainId,
      signingCredential: this.ethereumConfig.signingCredential,
      contractName: this.ethereumConfig.contractName,
      contractAddress: this.ethereumConfig.contractAddress,
      gas: this.ethereumConfig.gas,
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
      claimFormat: this.ethereumConfig.claimFormat,
    };
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupContracts(claimFormat: ClaimFormat) {
    const deployOutSATPContract = await this.connector.deployContract({
      contract: {
        keychainId: this.keychainPlugin1.getKeychainId(),
        contractName: this.erc20TokenContract,
      },
      constructorArgs: [
        WHALE_ACCOUNT_ADDRESS,
        EthereumTestEnvironment.ETH_ASSET_ID,
      ],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
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
      contract: {
        keychainId: this.keychainPlugin2.getKeychainId(),
        contractName: this.contractNameWrapper,
      },
      constructorArgs: [this.bridgeEthAccount],
      web3SigningCredential: {
        ethAccount: this.bridgeEthAccount,
        secret: "test",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
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

    this.ethereumConfig = {
      network: this.network,
      keychainId: this.keychainPlugin2.getKeychainId(),
      signingCredential: {
        ethAccount: this.bridgeEthAccount,
        secret: "test",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      contractName: this.contractNameWrapper,
      contractAddress: this.wrapperContractAddress,
      options: this.connectorOptions,
      bungeeOptions: this.bungeeOptions,
      gas: 5000000,
      claimFormat: claimFormat,
    };

    const giveRoleRes = await this.connector.invokeContract({
      contract: {
        contractName: this.erc20TokenContract,
        keychainId: this.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [this.wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    this.log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");

    const responseMint = await this.connector.invokeContract({
      contract: {
        contractName: this.erc20TokenContract,
        keychainId: this.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "mint",
      params: [WHALE_ACCOUNT_ADDRESS, "100"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseMint).toBeTruthy();
    expect(responseMint.success).toBeTruthy();
    this.log.info("Minted 100 tokens to firstHighNetWorthAccount");

    const responseApprove = await this.connector.invokeContract({
      contract: {
        contractName: this.erc20TokenContract,
        keychainId: this.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [this.wrapperContractAddress, "100"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseApprove).toBeTruthy();
    expect(responseApprove.success).toBeTruthy();
    this.log.info("Approved 100 tokens to SATPWrapperContract");
  }

  // Gets the default asset configuration for testing
  public get defaultAsset(): Asset {
    return {
      owner: WHALE_ACCOUNT_ADDRESS,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: this.erc20TokenContract,
      contractAddress: this.assetContractAddress,
    };
  }

  // Returns the whale account address used for testing transactions
  get transactRequestPubKey(): string {
    return WHALE_ACCOUNT_ADDRESS;
  }

  // Stops and destroys the test ledger
  public async tearDown(): Promise<void> {
    await this.ledger.stop();
    await this.ledger.destroy();
  }
}
