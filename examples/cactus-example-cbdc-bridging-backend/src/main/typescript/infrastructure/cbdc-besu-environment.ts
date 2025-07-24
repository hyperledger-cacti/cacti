import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  INetworkOptions,
  NetworkIdLedgerTypeEnum,
  TokenType,
  TransactRequestSourceAsset,
} from "@hyperledger/cactus-plugin-satp-hermes";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import Docker from "dockerode";
import { Account } from "web3-core";
import { randomUUID as uuidv4 } from "node:crypto";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import SATPTokenContract from "../../solidity/generated/SATPTokenContract.sol/SATPTokenContract.json";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType as BesuContractInvocationType,
  EthContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
  Web3SigningCredentialType as Web3SigningCredentialTypeBesu,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { NetworkId, ClaimFormat } from "@hyperledger/cactus-plugin-satp-hermes";
import { LedgerType } from "@hyperledger/cactus-core-api";
import CryptoMaterial from "../../../crypto-material/crypto-material.json";
import { getUserFromPseudonim } from "./utils";
import ExampleOntology from "../../json/ontologies/ontology-satp-erc20-interact-besu.json";

export class BesuEnvironment {
  public static readonly BESU_ASSET_ID: string = "BesuCBDCAsset";
  public static readonly BESU_NETWORK_ID: string = "BesuLedgerCBDCNetwork";
  public static readonly SATP_CONTRACT_NAME: string = "CBDCContract";
  public static readonly BESU_ASSET_REFERENCE_ID: string = ExampleOntology.id;

  private readonly log: Logger;

  private dockerNetwork: string = "besu";

  private ledger!: BesuTestLedger;
  private connector?: PluginLedgerConnectorBesu;
  private connectorOptions?: IPluginLedgerConnectorBesuOptions;

  private firstHighNetWorthAccount!: string;
  private bridgeEthAccount?: Account;
  public besuKeyPair?: { privateKey: string };
  public keychainEntryKey?: string;
  public keychainEntryValue?: string;
  public assetContractAddress?: string;

  public keychainPlugin1!: PluginKeychainMemory;
  public keychainPlugin2!: PluginKeychainMemory;

  public readonly network: NetworkId = {
    id: BesuEnvironment.BESU_NETWORK_ID,
    ledgerType: LedgerType.Besu2X,
  };

  private dockerContainerIP?: string;

  private approveAddress?: string;

  private readonly logLevel: LogLevelDesc;

  public constructor(logLevel: LogLevelDesc, network?: string) {
    if (network) {
      this.dockerNetwork = network;
    }

    this.logLevel = logLevel || "INFO";
    const label = "BesuEnvironment";
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });
  }

  // Initializes the Besu ledger, accounts, and connector for testing
  public async init(): Promise<void> {
    this.ledger = new BesuTestLedger({
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
      networkName: this.dockerNetwork,
      containerImageVersion: "2024-06-09-cc2f9c5",
      containerImageName: "ghcr.io/hyperledger/cactus-besu-all-in-one",
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

    // Accounts setup
    this.firstHighNetWorthAccount = this.ledger.getGenesisAccountPubKey();
    this.bridgeEthAccount = await this.ledger.createEthTestAccount();

    // Besu Key Pair setup
    this.besuKeyPair = { privateKey: this.ledger.getGenesisAccountPrivKey() };
    this.keychainEntryValue = this.besuKeyPair.privateKey;
    this.keychainEntryKey = uuidv4();

    // Keychain Plugins setup
    this.keychainPlugin1 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      backend: new Map([[this.keychainEntryKey, this.keychainEntryValue]]),
      logLevel: this.logLevel,
    });

    this.keychainPlugin2 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      backend: new Map([[this.keychainEntryKey, this.keychainEntryValue]]),
      logLevel: this.logLevel,
    });

    // Smart Contract Configuration
    this.keychainPlugin1.set(
      BesuEnvironment.SATP_CONTRACT_NAME,
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
      logLevel: this.logLevel,
    };

    this.connector = new PluginLedgerConnectorBesu(this.connectorOptions);

    const accounts = [
      CryptoMaterial.accounts.userA.ethAddress,
      CryptoMaterial.accounts.userB.ethAddress,
      CryptoMaterial.accounts.bridge.ethAddress,
      this.bridgeEthAccount?.address,
    ];

    for (const account of accounts) {
      await this.ledger.sendEthToAccount(account);
    }
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupContracts() {
    const deployOutSATPTokenContract = await this.connector?.deployContract({
      keychainId: this.keychainPlugin1.getKeychainId(),
      contractName: BesuEnvironment.SATP_CONTRACT_NAME,
      contractAbi: SATPTokenContract.abi,
      constructorArgs: [this.firstHighNetWorthAccount],
      web3SigningCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair?.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      bytecode: SATPTokenContract.bytecode.object,
      gas: 999999999999999,
    });
    if (
      !deployOutSATPTokenContract ||
      !deployOutSATPTokenContract.transactionReceipt ||
      !deployOutSATPTokenContract.transactionReceipt.contractAddress
    ) {
      throw new Error("Failed to deploy SATPTokenContract");
    }

    this.assetContractAddress =
      deployOutSATPTokenContract?.transactionReceipt.contractAddress ?? "";

    this.log.info("SATPTokenContract Deployed successfully");
  }

  public setApproveAddress(approveAddress: string) {
    this.approveAddress = approveAddress;
  }

  public async mintTokensBesu(user: string, amount: number) {
    const userEthAddress = this.getEthAddress(user);
    this.log.debug(
      `Minting Besu tokens for user: ${userEthAddress}, amount: ${amount}`,
    );

    try {
      const response = await this.connector?.invokeContract({
        contractName: BesuEnvironment.SATP_CONTRACT_NAME,
        keychainId: this.keychainPlugin1.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "mint",
        params: [userEthAddress, amount],
        signingCredential: {
          ethAccount: this.firstHighNetWorthAccount,
          secret: this.besuKeyPair?.privateKey,
          type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
        },
        gas: 1000000,
      });

      this.log.debug(
        `Besu - Minting tokens for user: ${user} is ${JSON.stringify(response)}`,
      );
    } catch (error) {
      this.log.error(error);
      throw new Error("Failed to mint tokens");
    }
  }

  public async giveRoleToBridge(wrapperAddress: string): Promise<void> {
    const giveRoleRes = await this.connector?.invokeContract({
      contractName: BesuEnvironment.SATP_CONTRACT_NAME,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "grantBridgeRole",
      params: [wrapperAddress],
      signingCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair?.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });

    if (!giveRoleRes || !giveRoleRes.success) {
      throw new Error("Failed to give BRIDGE_ROLE to Bridge");
    }
    this.log.info("BRIDGE_ROLE given to Bridge successfully");
  }

  public async approveAmount(
    wrapperAddress: string,
    amount: string,
  ): Promise<void> {
    const responseApprove = await this.connector?.invokeContract({
      contractName: BesuEnvironment.SATP_CONTRACT_NAME,
      keychainId: this.keychainPlugin1.getKeychainId(),
      invocationType: BesuContractInvocationType.Send,
      methodName: "approve",
      params: [wrapperAddress, amount],
      signingCredential: {
        ethAccount: this.firstHighNetWorthAccount,
        secret: this.besuKeyPair?.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 999999999,
    });
    if (!responseApprove || !responseApprove.success) {
      throw new Error("Failed to approve tokens");
    }
    this.log.info("Approved 100 tokens to SATPWrapperContract");
  }

  // this is the config to be loaded by the gateway when in a docker, does not contain the log level because it will use the one in the gateway config
  public async createBesuDockerConfig(): Promise<INetworkOptions> {
    return {
      networkIdentification: this.network,
      signingCredential: {
        ethAccount: this.bridgeEthAccount?.address,
        secret: this.bridgeEthAccount?.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 9999999999,
      connectorOptions: {
        rpcApiHttpHost: await this.ledger.getRpcApiHttpHost(false),
        rpcApiWsHost: await this.ledger.getRpcApiWsHost(false),
      },
      claimFormats: [ClaimFormat.DEFAULT],
    } as INetworkOptions;
  }

  public async getBesuBalance(frontendUser: string) {
    const userEthAddress = this.getEthAddress(frontendUser);
    this.log.debug(`Getting BESU balance for user: ${frontendUser}`);

    if (this.connector === undefined) {
      throw new Error("connector is undefined");
    }

    try {
      const response = await this.connector.invokeContract({
        contractName: BesuEnvironment.SATP_CONTRACT_NAME,
        keychainId: this.keychainPlugin1.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "checkBalance",
        params: [userEthAddress],
        signingCredential: {
          ethAccount: userEthAddress,
          secret: this.getEthUserPrKey(frontendUser),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });

      this.log.debug(
        `BESU - Balance for user: ${frontendUser} is ${JSON.stringify(response)}`,
      );
      this.log.debug(
        `BESU - Balance for user: ${frontendUser} is ${response.callOutput}`,
      );

      return parseInt(response.callOutput);
    } catch (error) {
      this.log.error(
        `BESU - Error getting balance user: ${frontendUser} with error: ${error}`,
      );
      return -1;
    }
  }

  public async transferTokensBesu(
    frontendUserFrom: string,
    frontendUserTo: string,
    amount: number,
  ) {
    const from = this.getEthAddress(frontendUserFrom);
    const to = this.getEthAddress(frontendUserTo);
    this.log.debug(
      `Transferring Besu tokens from: ${frontendUserFrom} to: ${frontendUserTo}`,
    );

    if (this.connector === undefined) {
      throw new Error("connector is undefined");
    }

    try {
      await this.connector.invokeContract({
        contractName: BesuEnvironment.SATP_CONTRACT_NAME,
        keychainId: this.keychainPlugin1.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "transfer",
        params: [to, amount],
        signingCredential: {
          ethAccount: from,
          secret: this.getEthUserPrKey(frontendUserFrom),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Failed to transfer tokens");
    }
  }

  public async approveNTokensBesu(frontendUserFrom: string, amount: number) {
    const from = this.getEthAddress(frontendUserFrom);
    this.log.debug(`Approving Besu tokens for user: ${frontendUserFrom}`);

    if (this.connector === undefined) {
      throw new Error("connector is undefined");
    }

    try {
      await this.connector.invokeContract({
        contractName: BesuEnvironment.SATP_CONTRACT_NAME,
        keychainId: this.keychainPlugin1.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "approve",
        params: [this.approveAddress, amount],
        signingCredential: {
          ethAccount: from,
          secret: this.getEthUserPrKey(frontendUserFrom),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });
    } catch (error) {
      this.log.error(error);
      return -1;
    }
  }

  public async getAmountApprovedBesu(frontendUser: string) {
    const from = this.getEthAddress(frontendUser);
    this.log.debug(`Getting approved balance for user: ${frontendUser}`);

    if (this.connector === undefined) {
      throw new Error("connector is undefined");
    }

    try {
      const response = await this.connector?.invokeContract({
        contractName: BesuEnvironment.SATP_CONTRACT_NAME,
        keychainId: this.keychainPlugin1.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "allowance",
        params: [from, this.approveAddress],
        signingCredential: {
          ethAccount: from,
          secret: this.getEthUserPrKey(frontendUser),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });
      return response.callOutput;
    } catch (error) {
      this.log.error(
        `Besu - Error getting approved balance user: ${frontendUser}, error: ${error}`,
      );
      return "0";
    }
  }

  public getBesuAsset(owner: string, amount: string) {
    return {
      owner: owner,
      contractName: BesuEnvironment.SATP_CONTRACT_NAME,
      contractAddress: this.assetContractAddress,
      id: BesuEnvironment.BESU_ASSET_ID,
      referenceId: BesuEnvironment.BESU_ASSET_REFERENCE_ID,
      amount,
      tokenType: TokenType.NonstandardFungible,
      networkId: {
        id: BesuEnvironment.BESU_NETWORK_ID,
        ledgerType: NetworkIdLedgerTypeEnum.Besu2X,
      },
    } as TransactRequestSourceAsset;
  }

  public getEthAddress(user: string) {
    switch (getUserFromPseudonim(user)) {
      case "userA":
        return CryptoMaterial.accounts["userA"].ethAddress;
      case "userB":
        return CryptoMaterial.accounts["userB"].ethAddress;
      case "bridge":
        return CryptoMaterial.accounts["bridge"].ethAddress;
      default:
        throw new Error("User not found");
    }
  }

  private getEthUserPrKey(user: string) {
    switch (getUserFromPseudonim(user)) {
      case "userA":
        return CryptoMaterial.accounts["userA"].privateKey;
      case "userB":
        return CryptoMaterial.accounts["userB"].privateKey;
      case "bridge":
        return CryptoMaterial.accounts["bridge"].privateKey;
      default:
        throw new Error("User not found");
    }
  }

  // Stops and destroys the test ledger
  public async tearDown(): Promise<void> {
    await this.ledger.stop();
    await this.ledger.destroy();
  }
}
