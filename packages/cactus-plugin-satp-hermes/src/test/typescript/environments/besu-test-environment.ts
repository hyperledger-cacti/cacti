import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  EthContractInvocationType as BesuContractInvocationType,
  InvokeContractV1Response,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredential,
  Web3SigningCredentialType as Web3SigningCredentialTypeBesu,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import SATPTokenContract from "../../solidity/generated/SATPTokenContract.sol/SATPTokenContract.json";
import Web3 from "web3";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { randomUUID as uuidv4 } from "node:crypto";
import { expect } from "@jest/globals";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Asset, AssetTokenTypeEnum, NetworkId } from "../../../main/typescript";
import { LedgerType } from "@hyperledger/cactus-core-api";
import {
  IBesuLeafNeworkOptions,
  IBesuLeafOptions,
} from "../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import ExampleOntology from "../../ontologies/ontology-satp-erc20-interact-besu.json";
import { INetworkOptions } from "../../../main/typescript/cross-chain-mechanisms/bridge/bridge-types";
import Docker from "dockerode";
export interface IBesuTestEnvironment {
  contractName: string;
  logLevel: LogLevelDesc;
  network?: string;
}
export class BesuTestEnvironment {
  public static readonly BESU_ASSET_ID: string = "BesuExampleAsset";
  public static readonly BESU_REFERENCE_ID: string = ExampleOntology.id;
  public static readonly BESU_NETWORK_ID: string = "BesuLedgerTestNetwork";
  public readonly network: NetworkId = {
    id: BesuTestEnvironment.BESU_NETWORK_ID,
    ledgerType: LedgerType.Besu2X,
  };
  public ledger!: BesuTestLedger;
  public connector!: PluginLedgerConnectorBesu;
  public connectorOptions!: IPluginLedgerConnectorBesuOptions;
  public keychainPlugin1!: PluginKeychainMemory;
  public keychainPlugin2!: PluginKeychainMemory;
  public besuKeyPair!: { privateKey: string };
  public keychainEntryKey!: string;
  public keychainEntryValue!: string;
  public web3!: Web3;
  public firstHighNetWorthAccount!: string;
  public bridgeEthAccount!: { address: string; privateKey: string };
  public assigneeEthAccount?: { address: string; privateKey: string };
  public erc20TokenContract!: string;
  public assetContractAddress?: string;
  public besuConfig!: IBesuLeafNeworkOptions;
  public gas: number = 999999999; // Default gas limit for transactions

  private dockerContainerIP?: string;
  private dockerNetwork: string = "besu";

  private readonly log: Logger;

  private constructor(
    erc20TokenContract: string,
    logLevel: LogLevelDesc,
    network?: string,
  ) {
    if (network) {
      this.dockerNetwork = network;
    }

    this.erc20TokenContract = erc20TokenContract;

    const level = logLevel || "INFO";
    const label = "BesuTestEnvironment";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  // Initializes the Besu ledger, accounts, and connector for testing
  public async init(logLevel: LogLevelDesc): Promise<void> {
    this.ledger = new BesuTestLedger({
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
      containerImageVersion: "2024-06-09-cc2f9c5",
      containerImageName: "ghcr.io/hyperledger/cactus-besu-all-in-one",
      networkName: this.dockerNetwork,
    });

    const docker = new Docker();

    const container = await this.ledger.start(false);

    const containerData = await docker
      .getContainer((await container).id)
      .inspect();

    this.dockerContainerIP =
      containerData.NetworkSettings.Networks[
        this.dockerNetwork || "bridge"
      ].IPAddress;

    const rpcApiHttpHost = await this.ledger.getRpcApiHttpHost();

    const rpcApiWsHost = await this.ledger.getRpcApiWsHost();

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
      JSON.stringify(SATPTokenContract),
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
    expect(parseInt(balance.toString(), 10)).toBeGreaterThan(10e9);
    this.log.info(`Bridge account funded: New Balance: ${balance} wei`);
  }

  // Creates and initializes a new BesuTestEnvironment instance

  // Other methods and properties...

  public static async setupTestEnvironment(
    config: IBesuTestEnvironment,
  ): Promise<BesuTestEnvironment> {
    const instance = new BesuTestEnvironment(
      config.contractName,
      config.logLevel,
      config.network,
    );
    await instance.init(config.logLevel);
    return instance;
  }

  // this is the config to be loaded by the gateway, does not contain the log level because it will use the one in the gateway config
  public createBesuConfig(): INetworkOptions {
    return {
      networkIdentification: this.besuConfig.networkIdentification,
      signingCredential: this.besuConfig.signingCredential,
      wrapperContractName: this.besuConfig.wrapperContractName,
      wrapperContractAddress: this.besuConfig.wrapperContractAddress,
      gas: this.besuConfig.gas,
      connectorOptions: {
        rpcApiHttpHost: this.connectorOptions.rpcApiHttpHost,
        rpcApiWsHost: this.connectorOptions.rpcApiWsHost,
      },
      claimFormats: this.besuConfig.claimFormats,
    } as INetworkOptions;
  }

  // this is the config to be loaded by the gateway when in a docker, does not contain the log level because it will use the one in the gateway config
  public async createBesuDockerConfig(): Promise<INetworkOptions> {
    return {
      networkIdentification: this.besuConfig.networkIdentification,
      signingCredential: this.besuConfig.signingCredential,
      wrapperContractName: this.besuConfig.wrapperContractName,
      wrapperContractAddress: this.besuConfig.wrapperContractAddress,
      gas: this.besuConfig.gas,
      connectorOptions: {
        rpcApiHttpHost: await this.ledger.getRpcApiHttpHost(false),
        rpcApiWsHost: await this.ledger.getRpcApiWsHost(false),
      },
      claimFormats: this.besuConfig.claimFormats,
    } as INetworkOptions;
  }

  // this creates the same config as the bridge manager does
  public createBesuLeafConfig(logLevel?: LogLevelDesc): IBesuLeafOptions {
    return {
      networkIdentification: this.besuConfig.networkIdentification,
      signingCredential: this.besuConfig.signingCredential,
      wrapperContractName: this.besuConfig.wrapperContractName,
      wrapperContractAddress: this.besuConfig.wrapperContractAddress,
      gas: this.besuConfig.gas,
      connectorOptions: {
        instanceId: this.connectorOptions.instanceId,
        rpcApiHttpHost: this.connectorOptions.rpcApiHttpHost,
        rpcApiWsHost: this.connectorOptions.rpcApiWsHost,
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: logLevel,
      },
      claimFormats: this.besuConfig.claimFormats,
      logLevel: logLevel,
    };
  }

  public getNetworkId(): string {
    return this.network.id;
  }

  public getNetworkType(): LedgerType {
    return this.network.ledgerType;
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupContracts(claimFormat: ClaimFormat) {
    const deployOutSATPTokenContract = await this.connector.deployContract({
      keychainId: this.keychainPlugin1.getKeychainId(),
      contractName: this.erc20TokenContract,
      contractAbi: SATPTokenContract.abi,
      constructorArgs: [this.firstHighNetWorthAccount],
      web3SigningCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      bytecode: SATPTokenContract.bytecode.object,
      gas: this.gas,
    });
    expect(deployOutSATPTokenContract).toBeTruthy();
    expect(deployOutSATPTokenContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutSATPTokenContract.transactionReceipt.contractAddress,
    ).toBeTruthy();

    this.assetContractAddress =
      deployOutSATPTokenContract.transactionReceipt.contractAddress ?? "";

    this.log.info("SATPTokenContract Deployed successfully");

    this.besuConfig = {
      networkIdentification: this.network,
      signingCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      leafId: "Testing-event-besu-leaf",
      connectorOptions: this.connectorOptions,
      claimFormats: [claimFormat],
      gas: this.gas,
    };
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupOracleContracts(
    claimFormat: ClaimFormat,
    contract_name: string,
    contract: { abi: any; bytecode: { object: string } },
  ): Promise<string> {
    const blOracleContract = await this.connector.deployContract({
      keychainId: this.keychainPlugin1.getKeychainId(),
      contractName: contract_name,
      contractAbi: contract.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      bytecode: contract.bytecode.object,
      gas: this.gas,
    });
    expect(blOracleContract).toBeTruthy();
    expect(blOracleContract.transactionReceipt).toBeTruthy();
    expect(blOracleContract.transactionReceipt.contractAddress).toBeTruthy();

    this.assetContractAddress =
      blOracleContract.transactionReceipt.contractAddress ?? "";

    this.log.info("this.businessLogicContract Deployed successfully");

    this.besuConfig = {
      networkIdentification: this.network,
      signingCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      leafId: "Testing-event-besu-leaf",
      connectorOptions: this.connectorOptions,
      claimFormats: [claimFormat],
      gas: this.gas,
    };

    return blOracleContract.transactionReceipt.contractAddress!;
  }

  public async mintTokens(amount: string): Promise<void> {
    const responseMint = await this.connector.invokeContract({
      contractName: this.erc20TokenContract,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "mint",
      params: [this.firstHighNetWorthAccount, amount],
      signingCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: this.besuConfig.gas,
    });
    expect(responseMint).toBeTruthy();
    expect(responseMint.success).toBeTruthy();
    this.log.info("Minted 100 tokens to firstHighNetWorthAccount");
  }

  public async giveRoleToBridge(wrapperAddress: string): Promise<void> {
    const giveRoleRes = await this.connector.invokeContract({
      contractName: this.erc20TokenContract,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "grantBridgeRole",
      params: [wrapperAddress],
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
  }

  public async approveAmount(
    wrapperAddress: string,
    amount: string,
  ): Promise<void> {
    const responseApprove = await this.connector.invokeContract({
      contractName: this.erc20TokenContract,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "approve",
      params: [wrapperAddress, amount],
      signingCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: this.besuConfig.gas,
    });
    expect(responseApprove).toBeTruthy();
    expect(responseApprove.success).toBeTruthy();
    this.log.info("Approved 100 tokens to SATPWrapperContract");
  }

  public getTestContractName(): string {
    return this.erc20TokenContract;
  }

  public getTestContractAddress(): string {
    return this.assetContractAddress ?? "";
  }

  public getTestContractAbi(): any {
    return SATPTokenContract.abi;
  }

  public getTestOwnerAccount(): string {
    return this.firstHighNetWorthAccount;
  }

  public getBridgeEthAccount(): string {
    return this.bridgeEthAccount.address;
  }

  public getTestOwnerSigningCredential(): Web3SigningCredential {
    return {
      ethAccount: this.firstHighNetWorthAccount,
      secret: this.besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    };
  }

  public getBridgeEthAccountSigningCredential(): Web3SigningCredential {
    return {
      ethAccount: this.bridgeEthAccount.address,
      secret: this.bridgeEthAccount.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    };
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
      contractName: contract_name,
      contractAddress: contract_address,
      contractAbi: contract_abi,
      invocationType: BesuContractInvocationType.Call,
      methodName: "balanceOf",
      params: [account],
      signingCredential: signingCredential,
      gas: this.besuConfig.gas,
    });

    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe(amount);
  }
  // Gets the default asset configuration for testing
  public get defaultAsset(): Asset {
    return {
      id: BesuTestEnvironment.BESU_ASSET_ID,
      referenceId: BesuTestEnvironment.BESU_REFERENCE_ID,
      owner: this.firstHighNetWorthAccount,
      contractName: this.erc20TokenContract,
      contractAddress: this.assetContractAddress,
      networkId: this.network,
      tokenType: AssetTokenTypeEnum.NonstandardFungible,
    };
  }

  // Returns the assignee account address used for testing transactions
  get transactRequestPubKey(): string {
    return this.assigneeEthAccount?.address ?? "";
  }

  // Oracle related functions

  public getData(
    contractName: string,
    contractAddress: string,
    contractAbi: any,
    methodName: string,
    params: string[],
  ): Promise<any> {
    return this.connector.invokeContract({
      contractName,
      contractAddress,
      contractAbi,
      invocationType: BesuContractInvocationType.Call,
      methodName,
      params,
      signingCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: this.besuConfig.gas,
    });
  }

  public async readData(
    contractName: string,
    contractAddress: string,
    contractAbi: any,
    methodName: string,
    params: string[],
  ): Promise<InvokeContractV1Response> {
    const response = await this.connector.invokeContract({
      contractName,
      contractAddress,
      contractAbi,
      invocationType: BesuContractInvocationType.Call,
      methodName,
      params,
      signingCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: this.besuConfig.gas,
    });

    expect(response).toBeTruthy();
    expect(response.success).toBeTruthy();

    return response;
  }

  public async writeData(
    contractName: string,
    contractAddress: string,
    contractAbi: any,
    methodName: string,
    params: string[],
  ): Promise<InvokeContractV1Response> {
    const response = await this.connector.invokeContract({
      contractName,
      contractAddress,
      contractAbi,
      invocationType: BesuContractInvocationType.Send,
      methodName,
      params,
      signingCredential: {
        ethAccount: this.bridgeEthAccount.address,
        secret: this.bridgeEthAccount.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: this.besuConfig.gas,
    });

    expect(response).toBeTruthy();
    expect(response.success).toBeTruthy();

    return response;
  }

  // Stops and destroys the test ledger
  public async tearDown(): Promise<void> {
    await this.ledger.stop();
    await this.ledger.destroy();
  }
}
