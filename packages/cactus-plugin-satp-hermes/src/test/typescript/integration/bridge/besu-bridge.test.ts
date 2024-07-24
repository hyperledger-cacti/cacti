import {
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
  BesuTestLedger,
} from "@hyperledger/cactus-test-tooling";
import { v4 as uuidv4 } from "uuid";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import SATPContract from "../../../solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import Web3 from "web3";
import { Account } from "web3-core";
import { BesuBridge } from "../../../../main/typescript/core/stage-services/satp-bridge/besu-bridge";
import { BesuAsset } from "../../../../main/typescript/core/stage-services/satp-bridge/types/besu-asset";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { BesuConfig } from "../../../../main/typescript/types/blockchain-interaction";
import SATPInteraction from "../../../solidity/satp-erc20-interact.json";

const logLevel: LogLevelDesc = "DEBUG";

let besuLedger: BesuTestLedger;
let erc20TokenContract: string;
let contractNameWrapper: string;

let rpcApiHttpHost: string;
let rpcApiWsHost: string;
let web3: Web3;
let firstHighNetWorthAccount: string;
let testing_connector: PluginLedgerConnectorBesu;
let besuKeyPair: { privateKey: string };
let bridgeEthAccount: Account;
let assigneeEthAccount: Account;
const BESU_ASSET_ID = uuidv4();

let keychainPlugin1: PluginKeychainMemory;
let keychainPlugin2: PluginKeychainMemory;

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let pluginBungeeHermesOptions: IPluginBungeeHermesOptions;

let besuBridge: BesuBridge;
let besuConfig: BesuConfig;
let besuOptions: IPluginLedgerConnectorBesuOptions;

let assetContractAddress: string;
let wrapperContractAddress: string;

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  {
    besuLedger = new BesuTestLedger({
      logLevel,
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
    });
    await besuLedger.start();

    rpcApiHttpHost = await besuLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuLedger.getRpcApiWsHost();
    web3 = new Web3(rpcApiHttpHost);
    firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

    bridgeEthAccount = await besuLedger.createEthTestAccount();

    assigneeEthAccount = await besuLedger.createEthTestAccount();

    besuKeyPair = {
      privateKey: besuLedger.getGenesisAccountPrivKey(),
    };

    erc20TokenContract = "SATPContract";
    contractNameWrapper = "SATPWrapperContract";

    const keychainEntryValue = besuKeyPair.privateKey;
    const keychainEntryKey = uuidv4();
    keychainPlugin1 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPlugin2 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPlugin1.set(erc20TokenContract, JSON.stringify(SATPContract));
    keychainPlugin2.set(
      contractNameWrapper,
      JSON.stringify(SATPWrapperContract),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPlugin1, keychainPlugin2],
    });

    besuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    testing_connector = new PluginLedgerConnectorBesu(besuOptions);
    pluginRegistry.add(testing_connector);

    await testing_connector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: bridgeEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
    });

    const balance = await web3.eth.getBalance(bridgeEthAccount.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toBeGreaterThan(10e9);
    log.info("Connector initialized");

    const deployOutSATPContract = await testing_connector.deployContract({
      keychainId: keychainPlugin1.getKeychainId(),
      contractName: erc20TokenContract,
      contractAbi: SATPContract.abi,
      constructorArgs: [firstHighNetWorthAccount, BESU_ASSET_ID],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: SATPContract.bytecode.object,
      gas: 999999999999999,
    });
    expect(deployOutSATPContract).toBeTruthy();
    expect(deployOutSATPContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutSATPContract.transactionReceipt.contractAddress,
    ).toBeTruthy();

    assetContractAddress =
      deployOutSATPContract.transactionReceipt.contractAddress ?? "";

    log.info("SATPContract Deployed successfully");

    const deployOutWrapperContract = await testing_connector.deployContract({
      keychainId: keychainPlugin2.getKeychainId(),
      contractName: contractNameWrapper,
      contractAbi: SATPWrapperContract.abi,
      constructorArgs: [bridgeEthAccount.address],
      web3SigningCredential: {
        ethAccount: bridgeEthAccount.address,
        secret: bridgeEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: SATPWrapperContract.bytecode.object,
      gas: 999999999999999,
    });
    expect(deployOutWrapperContract).toBeTruthy();
    expect(deployOutWrapperContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutWrapperContract.transactionReceipt.contractAddress,
    ).toBeTruthy();
    log.info("SATPWrapperContract Deployed successfully");

    wrapperContractAddress =
      deployOutWrapperContract.transactionReceipt.contractAddress ?? "";

    pluginBungeeHermesOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      //pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    besuConfig = {
      keychainId: keychainPlugin2.getKeychainId(),
      signingCredential: {
        ethAccount: bridgeEthAccount.address,
        secret: bridgeEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractName: contractNameWrapper,
      contractAddress: wrapperContractAddress,
      options: besuOptions,
      bungeeOptions: pluginBungeeHermesOptions,
      gas: 9999999999999,
      logLevel,
    };

    const giveRoleRes = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");
  }
});

afterAll(async () => {
  await besuLedger.stop();
  await besuLedger.destroy();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("Besu Bridge Test", () => {
  it("Should Initialize the bridge", async () => {
    besuBridge = new BesuBridge(besuConfig);
    expect(besuBridge).toBeDefined();
  });
  it("Should Wrap a token", async () => {
    const asset = {
      tokenId: BESU_ASSET_ID,
      tokenType: TokenType.NONSTANDARD,
      owner: firstHighNetWorthAccount,
      contractName: erc20TokenContract,
      contractAddress: assetContractAddress,
      ontology: JSON.stringify(SATPInteraction),
    } as BesuAsset;

    const response = await besuBridge.wrapAsset(asset);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuBridge.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(BESU_ASSET_ID);

    const response3 = await besuBridge.getAsset(BESU_ASSET_ID);
    expect(response3).toBeDefined();
    expect(response3.tokenId).toBe(BESU_ASSET_ID);
    expect(response3.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response3.owner).toBe(firstHighNetWorthAccount);
    expect(response3.contractAddress).toBe(assetContractAddress);
  });

  it("Should Lock a token", async () => {
    const responseMint = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "mint",
      params: [firstHighNetWorthAccount, "100"],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseMint).toBeTruthy();
    expect(responseMint.success).toBeTruthy();
    log.info("Minted 100 tokens to firstHighNetWorthAccount");

    const responseApprove = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [wrapperContractAddress, "100"],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseApprove).toBeTruthy();
    expect(responseApprove.success).toBeTruthy();
    log.info("Approved 100 tokens to SATPWrapperContract");

    const response = await besuBridge.lockAsset(BESU_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuBridge.getAsset(BESU_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(BESU_ASSET_ID);
    expect(response2.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response2.owner).toBe(firstHighNetWorthAccount);
    expect(response2.contractAddress).toBe(assetContractAddress);
    expect(response2.amount).toBe("100");
    log.info("Locked 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("100");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalanceOwner = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const response = await besuBridge.unlockAsset(BESU_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuBridge.getAsset(BESU_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(BESU_ASSET_ID);
    expect(response2.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response2.owner).toBe(firstHighNetWorthAccount);
    expect(response2.contractAddress).toBe(assetContractAddress);
    expect(response2.amount).toBe("0");
    log.info("Unlocked 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalanceOwner = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("100");
    log.info("Amount was transfer correctly from the Wrapper account");
  });

  it("Should Burn a token", async () => {
    const responseApprove = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [wrapperContractAddress, "100"],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseApprove).toBeTruthy();
    expect(responseApprove.success).toBeTruthy();
    log.info("Approved 100 tokens to SATPWrapperContract");

    const response = await besuBridge.lockAsset(BESU_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Locked 100 tokens successfully");

    const response2 = await besuBridge.burnAsset(BESU_ASSET_ID, 100);
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info("Burned 100 tokens successfully");

    const response3 = await besuBridge.getAsset(BESU_ASSET_ID);
    expect(response3).toBeDefined();
    expect(response3.tokenId).toBe(BESU_ASSET_ID);
    expect(response3.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response3.owner).toBe(firstHighNetWorthAccount);
    expect(response3.contractAddress).toBe(assetContractAddress);
    expect(response3.amount).toBe("0");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was burned correctly to the Wrapper account");
  });

  it("Should Mint a token", async () => {
    const response = await besuBridge.mintAsset(BESU_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Minted 100 tokens successfully");

    const response2 = await besuBridge.getAsset(BESU_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(BESU_ASSET_ID);
    expect(response2.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response2.owner).toBe(firstHighNetWorthAccount);
    expect(response2.contractAddress).toBe(assetContractAddress);
    expect(response2.amount).toBe("100");
    log.info("Minted 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("100");
    log.info("Amount was minted correctly to the Wrapper account");
  });

  it("Should Assign a token", async () => {
    const response = await besuBridge.assignAsset(
      BESU_ASSET_ID,
      assigneeEthAccount.address,
      100,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Assigned 100 tokens successfully");

    const response2 = await besuBridge.getAsset(BESU_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(BESU_ASSET_ID);
    expect(response2.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response2.contractAddress).toBe(assetContractAddress);
    expect(response2.amount).toBe("0");
    log.info("Assigned 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was assigned correctly to the Wrapper account");

    const responseBalanceOwner = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [assigneeEthAccount.address],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("100");
    log.info("Amount was assigned correctly to the Assignee account");
  });

  it("Should Unwrap a token", async () => {
    const response = await besuBridge.unwrapAsset(BESU_ASSET_ID);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuBridge.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped 100 tokens successfully");
  });
});
