import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../main/solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { randomUUID as uuidv4 } from "node:crypto";
import {
  EthContractInvocationType,
  GasTransactionConfig,
  InvokeContractV1Response,
  IPluginLedgerConnectorEthereumOptions,
  PluginLedgerConnectorEthereum,
  Web3SigningCredential,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { expect } from "@jest/globals";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Asset, AssetTokenTypeEnum, NetworkId } from "../../../main/typescript";
import { LedgerType } from "@hyperledger/cactus-core-api";
import {
  IEthereumLeafNeworkOptions,
  IEthereumLeafOptions,
} from "../../../main/typescript/cross-chain-mechanisms/bridge/leafs/ethereum-leaf";
import { OntologyManager } from "../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import ExampleOntology from "../../ontologies/ontology-satp-erc20-interact-ethereum.json";
import { INetworkOptions } from "../../../main/typescript/cross-chain-mechanisms/bridge/bridge-types";

export interface IEthereumTestEnvironment {
  contractName: string;
  logLevel: LogLevelDesc;
  network?: string;
}
// Test environment for Ethereum ledger operations
export class EthereumTestEnvironment {
  public static readonly ETH_ASSET_ID: string = "EthereumExampleAsset";
  public static readonly ETHREFERENCE_ID: string = ExampleOntology.id;
  public static readonly ETH_NETWORK_ID: string = "EthereumLedgerTestNetwork";
  public readonly network: NetworkId = {
    id: EthereumTestEnvironment.ETH_NETWORK_ID,
    ledgerType: LedgerType.Ethereum,
  };
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
  public ethereumConfig!: IEthereumLeafNeworkOptions;
  public gasConfig: GasTransactionConfig | undefined = {
    gas: "6721975",
    gasPrice: "20000000000",
  };

  private dockerNetwork?: string;

  private readonly log: Logger;

  // eslint-disable-next-line prettier/prettier
  private constructor(
    erc20TokenContract: string,
    logLevel: LogLevelDesc,
    network?: string,
  ) {
    if (network) {
      this.dockerNetwork = network;
    }

    this.contractNameWrapper = "SATPWrapperContract";
    this.erc20TokenContract = erc20TokenContract;

    const level = logLevel || "INFO";
    const label = "EthereumTestEnvironment";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  // Initializes the Ethereum ledger, accounts, and connector for testing
  public async init(logLevel: LogLevelDesc): Promise<void> {
    this.ledger = new GethTestLedger({
      containerImageName: "ghcr.io/hyperledger/cacti-geth-all-in-one",
      containerImageVersion: "2023-07-27-2a8c48ed6",
      networkName: this.dockerNetwork,
    });

    await this.ledger.start(false, []);

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

    const rpcApiWsHost = await this.ledger.getRpcApiWebSocketHost();
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
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };

    this.connector = new PluginLedgerConnectorEthereum(this.connectorOptions);
  }

  public getTestContractAddress(): string {
    return this.assetContractAddress ?? "";
  }

  public getTestContractName(): string {
    return this.erc20TokenContract;
  }

  public getTestContractAbi(): any {
    return SATPContract.abi;
  }

  public getTestOwnerAccount(): string {
    return WHALE_ACCOUNT_ADDRESS;
  }

  public getBridgeEthAccount(): string {
    return this.bridgeEthAccount;
  }

  public getTestOwnerSigningCredential(): Web3SigningCredential {
    return {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    };
  }

  public getTestBridgeSigningCredential(): Web3SigningCredential {
    return {
      ethAccount: this.bridgeEthAccount,
      secret: "test",
      type: Web3SigningCredentialType.GethKeychainPassword,
    };
  }

  public getTestOracleSigningCredential(): Web3SigningCredential {
    return {
      ethAccount: this.bridgeEthAccount,
      secret: "test",
      type: Web3SigningCredentialType.GethKeychainPassword,
    };
  }

  // Creates and initializes a new EthereumTestEnvironment instance
  public static async setupTestEnvironment(
    config: IEthereumTestEnvironment,
  ): Promise<EthereumTestEnvironment> {
    const instance = new EthereumTestEnvironment(
      config.contractName,
      config.logLevel,
      config.network,
    );
    await instance.init(config.logLevel);
    return instance;
  }

  // this creates the same config as the bridge manager does
  public createEthereumLeafConfig(
    ontologyManager: OntologyManager,
    logLevel?: LogLevelDesc,
  ): IEthereumLeafOptions {
    return {
      networkIdentification: this.ethereumConfig.networkIdentification,
      signingCredential: this.ethereumConfig.signingCredential,
      ontologyManager: ontologyManager,
      wrapperContractName: this.ethereumConfig.wrapperContractName,
      wrapperContractAddress: this.ethereumConfig.wrapperContractAddress,
      gasConfig: this.ethereumConfig.gasConfig,
      connectorOptions: {
        instanceId: this.connectorOptions.instanceId,
        rpcApiHttpHost: this.connectorOptions.rpcApiHttpHost,
        rpcApiWsHost: this.connectorOptions.rpcApiWsHost,
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: logLevel,
      },
      claimFormats: this.ethereumConfig.claimFormats,
      logLevel: logLevel,
    };
  }

  // this is the config to be loaded by the gateway, does not contain the log level because it will use the one in the gateway config
  public createEthereumConfig(): INetworkOptions {
    return {
      networkIdentification: this.ethereumConfig.networkIdentification,
      signingCredential: this.ethereumConfig.signingCredential,
      wrapperContractName: this.ethereumConfig.wrapperContractName,
      wrapperContractAddress: this.ethereumConfig.wrapperContractAddress,
      gasConfig: this.ethereumConfig.gasConfig,
      connectorOptions: {
        rpcApiHttpHost: this.connectorOptions.rpcApiHttpHost,
        rpcApiWsHost: this.connectorOptions.rpcApiWsHost,
      },
      claimFormats: this.ethereumConfig.claimFormats,
    } as INetworkOptions;
  }

  // this is the config to be loaded by the gateway when in a docker, does not contain the log level because it will use the one in the gateway config
  public async createEthereumDockerConfig(): Promise<INetworkOptions> {
    return {
      networkIdentification: this.ethereumConfig.networkIdentification,
      signingCredential: this.ethereumConfig.signingCredential,
      wrapperContractName: this.ethereumConfig.wrapperContractName,
      wrapperContractAddress: this.ethereumConfig.wrapperContractAddress,
      gasConfig: this.ethereumConfig.gasConfig,
      connectorOptions: {
        rpcApiHttpHost: await this.ledger.getRpcApiHttpHost(false),
        rpcApiWsHost: await this.ledger.getRpcApiWebSocketHost(false),
      },
      claimFormats: this.ethereumConfig.claimFormats,
    } as INetworkOptions;
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

    this.ethereumConfig = {
      networkIdentification: this.network,
      signingCredential: {
        ethAccount: this.bridgeEthAccount,
        secret: "test",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      leafId: "Testing-event-ethereum-leaf",
      connectorOptions: this.connectorOptions,
      claimFormats: [claimFormat],
      gasConfig: this.gasConfig,
    };

    this.log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupOracleContracts(
    claimFormat: ClaimFormat,
    contract_name: string,
    contract: { abi: any; bytecode: { object: string } },
  ): Promise<string> {
    const blOracleContract = await this.connector.deployContract({
      contract: {
        contractJSON: {
          contractName: contract_name,
          abi: contract.abi,
          bytecode: contract.bytecode.object,
        },
        keychainId: this.keychainPlugin1.getKeychainId(),
      },
      constructorArgs: [],
      web3SigningCredential: this.getTestOracleSigningCredential(),
      gasConfig: this.gasConfig,
    });
    expect(blOracleContract).toBeTruthy();
    expect(blOracleContract.transactionReceipt).toBeTruthy();
    expect(blOracleContract.transactionReceipt.contractAddress).toBeTruthy();

    this.assetContractAddress =
      blOracleContract.transactionReceipt.contractAddress ?? "";

    this.log.info("Oracle Business Logic Contract Deployed successfully");

    this.ethereumConfig = {
      networkIdentification: this.network,
      signingCredential: this.getTestOracleSigningCredential(),
      connectorOptions: this.connectorOptions,
      claimFormats: [claimFormat],
      gasConfig: this.gasConfig,
    };

    return blOracleContract.transactionReceipt.contractAddress!;
  }

  public async mintTokens(amount: string): Promise<void> {
    const responseMint = await this.connector.invokeContract({
      contract: {
        contractName: this.erc20TokenContract,
        keychainId: this.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "mint",
      params: [WHALE_ACCOUNT_ADDRESS, amount],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseMint).toBeTruthy();
    expect(responseMint.success).toBeTruthy();
    this.log.info("Minted 100 tokens to firstHighNetWorthAccount");
  }

  public async giveRoleToBridge(wrapperAddress: string): Promise<void> {
    const giveRoleRes = await this.connector.invokeContract({
      contract: {
        contractName: this.erc20TokenContract,
        keychainId: this.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [wrapperAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    this.log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");
  }

  public async approveAmount(
    wrapperAddress: string,
    amount: string,
  ): Promise<void> {
    const responseApprove = await this.connector.invokeContract({
      contract: {
        contractName: this.erc20TokenContract,
        keychainId: this.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [wrapperAddress, amount],
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

  public async checkBalance(
    contract_name: string,
    contract_address: string,
    contract_abi: any,
    account: string,
    amount: string,
    signingCredential: Web3SigningCredential,
  ): Promise<void> {
    const responseBalanceBridge = await this.connector.invokeContract({
      contract: {
        contractJSON: {
          contractName: contract_name,
          abi: contract_abi,
          bytecode: contract_abi.object,
        },
        contractAddress: contract_address,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [account],
      web3SigningCredential: signingCredential,
    });

    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput.toString()).toBe(amount);
  }
  // Gets the default asset configuration for testing
  public get defaultAsset(): Asset {
    return {
      id: EthereumTestEnvironment.ETH_ASSET_ID,
      referenceId: EthereumTestEnvironment.ETHREFERENCE_ID,
      owner: WHALE_ACCOUNT_ADDRESS,
      contractName: this.erc20TokenContract,
      contractAddress: this.assetContractAddress,
      networkId: this.network,
      tokenType: AssetTokenTypeEnum.NonstandardFungible,
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

  public async writeData(
    contractName: string,
    contractAddress: string,
    contractAbi: any,
    methodName: string,
    params: string[],
  ): Promise<InvokeContractV1Response> {
    return await this.connector.invokeContract({
      contract: {
        contractJSON: {
          contractName: contractName,
          abi: contractAbi,
          bytecode: contractAbi.object,
        },
        contractAddress: contractAddress,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: methodName,
      params: params,
      web3SigningCredential: this.getTestOracleSigningCredential(),
    });
  }

  public readData(
    contractName: string,
    contractAddress: string,
    contractAbi: any,
    methodName: string,
    params: string[],
  ): Promise<InvokeContractV1Response> {
    return this.connector.invokeContract({
      contract: {
        contractJSON: {
          contractName: contractName,
          abi: contractAbi,
          bytecode: contractAbi.object,
        },
        contractAddress: contractAddress,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: methodName,
      params: params,
      web3SigningCredential: this.getTestOracleSigningCredential(),
    });
  }
}
