import {
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { v4 as uuidv4 } from "uuid";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import SATPContract from "../../../solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { PluginRegistry } from "@hyperledger/cactus-core";
import Web3 from "web3";
import { EvmAsset } from "../../../../main/typescript/core/stage-services/satp-bridge/types/evm-asset";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { EthereumConfig } from "../../../../main/typescript/types/blockchain-interaction";
import SATPInteraction from "../../../solidity/satp-erc20-interact.json";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorEthereumOptions,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { EthereumBridge } from "../../../../main/typescript/core/stage-services/satp-bridge/ethereum-bridge";
import { LedgerType } from "@hyperledger/cactus-core-api";

const logLevel: LogLevelDesc = "DEBUG";

let ethereumLedger: GethTestLedger;
let erc20TokenContract: string;
let contractNameWrapper: string;

let rpcApiHttpHost: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let web3: Web3;
let testing_connector: PluginLedgerConnectorEthereum;
let bridgeEthAccount: string;
let assigneeEthAccount: string;
const ETH_ASSET_ID = uuidv4();

let keychainPlugin1: PluginKeychainMemory;
let keychainPlugin2: PluginKeychainMemory;

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let pluginBungeeHermesOptions: IPluginBungeeHermesOptions;

let ethereumBridge: EthereumBridge;
let ethereumConfig: EthereumConfig;
let ethereumOptions: IPluginLedgerConnectorEthereumOptions;

let assetContractAddress: string;
let wrapperContractAddress: string;
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
    const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
    const containerImageVersion = "2023-07-27-2a8c48ed6";
    ethereumLedger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ethereumLedger.start();

    //setup ethereum ledger
    rpcApiHttpHost = await ethereumLedger.getRpcApiHttpHost();
    web3 = new Web3(rpcApiHttpHost);

    bridgeEthAccount = await ethereumLedger.newEthPersonalAccount();
    assigneeEthAccount = await ethereumLedger.newEthPersonalAccount();
    erc20TokenContract = "SATPContract";
    contractNameWrapper = "SATPWrapperContract";

    const keychainEntryValue = "test";
    const keychainEntryKey = bridgeEthAccount;
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

    keychainPlugin1.set(erc20TokenContract, JSON.stringify(SATPContract1));
    keychainPlugin2.set(
      contractNameWrapper,
      JSON.stringify(SATPWrapperContract1),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPlugin1, keychainPlugin2],
    });

    ethereumOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      pluginRegistry,
      logLevel,
    };
    testing_connector = new PluginLedgerConnectorEthereum(ethereumOptions);
    pluginRegistry.add(testing_connector);
    log.info("Connector initialized");

    const deployOutSATPContract = await testing_connector.deployContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      constructorArgs: [WHALE_ACCOUNT_ADDRESS, ETH_ASSET_ID],
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

    assetContractAddress =
      deployOutSATPContract.transactionReceipt.contractAddress ?? "";

    log.info("SATPContract Deployed successfully");
    /*const price = await testing_connector.invokeRawWeb3EthMethod({
      methodName: "getGasPrice",
    });*/
    const deployOutWrapperContract = await testing_connector.deployContract({
      contract: {
        keychainId: keychainPlugin2.getKeychainId(),
        contractName: contractNameWrapper,
      },
      constructorArgs: [bridgeEthAccount],
      web3SigningCredential: {
        ethAccount: bridgeEthAccount,
        secret: "test",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      /*gasConfig: {
        gas: "5000000",
        gasPrice: price.toString(),
        //gasLimit: block.gasLimit.toString(),
        //maxPriorityFeePerGas: block.baseFeePerGas.toString(),
        //maxFeePerGas: block.baseFeePerGas.toString(),
      },*/
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
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    ethereumConfig = {
      network: { id: "ETHEREUM", ledgerType: LedgerType.Ethereum },
      keychainId: keychainPlugin2.getKeychainId(),
      signingCredential: {
        ethAccount: bridgeEthAccount,
        secret: "test",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      contractName: contractNameWrapper,
      contractAddress: wrapperContractAddress,
      options: ethereumOptions,
      bungeeOptions: pluginBungeeHermesOptions,
      gas: 5000000,
      claimFormat: ClaimFormat.BUNGEE,
    };

    const giveRoleRes = await testing_connector.invokeContract({
      contract: {
        contractName: erc20TokenContract,
        keychainId: keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    await testing_connector.invokeContract({
      contract: {
        contractName: erc20TokenContract,
        keychainId: keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [bridgeEthAccount],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");
  }
});

afterAll(async () => {
  await ethereumLedger.stop();
  await ethereumLedger.destroy();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("Ethereum Bridge Test", () => {
  it("Should Initialize the bridge", async () => {
    ethereumBridge = new EthereumBridge(ethereumConfig);
    expect(ethereumBridge).toBeDefined();
  });
  it("Should Wrap a token", async () => {
    const asset = {
      tokenId: ETH_ASSET_ID,
      tokenType: TokenType.NONSTANDARD,
      owner: WHALE_ACCOUNT_ADDRESS,
      contractName: erc20TokenContract,
      contractAddress: assetContractAddress,
      ontology: JSON.stringify(SATPInteraction),
    } as EvmAsset;

    const response = await ethereumBridge.wrapAsset(asset);
    //const interactions = ethereumBridge.interactionList(asset.ontology);
    /*await testing_connector.invokeRawWeb3EthContract({
      abi: SATPWrapperContract1.abi,
      address: wrapperContractAddress,
      invocationType: "send",
      contractMethod: "wrap",
      contractMethodArgs: [
        asset.contractAddress,
        asset.tokenType,
        asset.tokenId,
        asset.owner,
        interactions,
      ],
    });*/
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumBridge.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(ETH_ASSET_ID);

    const response3 = await ethereumBridge.getAsset(ETH_ASSET_ID);
    expect(response3).toBeDefined();
    expect(response3.tokenId).toBe(ETH_ASSET_ID);
    expect(response3.tokenType.toString().replace("o", "")).toBe(
      TokenType.NONSTANDARD.toString(),
    );
    expect(response3.owner.toLowerCase()).toBe(WHALE_ACCOUNT_ADDRESS);
    expect(response3.contractAddress.toLowerCase()).toBe(assetContractAddress);
  });

  it("Should Lock a token", async () => {
    const responseMint = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
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
    log.info("Minted 100 tokens to WHALE_ACCOUNT_ADDRESS");

    const responseApprove = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [wrapperContractAddress, "100"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseApprove).toBeTruthy();
    expect(responseApprove.success).toBeTruthy();
    log.info("Approved 100 tokens to SATPWrapperContract");

    const response = await ethereumBridge.lockAsset(ETH_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumBridge.getAsset(ETH_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(ETH_ASSET_ID);
    expect(response2.tokenType.toString().replace("o", "")).toBe(
      TokenType.NONSTANDARD.toString(),
    );
    expect(response2.owner.toLowerCase()).toBe(WHALE_ACCOUNT_ADDRESS);
    expect(response2.contractAddress.toLowerCase()).toBe(assetContractAddress);
    expect(response2.amount.toString()).toBe("100");
    log.info("Locked 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput.toString()).toBe("100");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalanceOwner = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [WHALE_ACCOUNT_ADDRESS],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput.toString()).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const response = await ethereumBridge.unlockAsset(ETH_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumBridge.getAsset(ETH_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(ETH_ASSET_ID);
    expect(response2.tokenType.toString().replace("o", "")).toBe(
      TokenType.NONSTANDARD.toString(),
    );
    expect(response2.owner.toLowerCase()).toBe(WHALE_ACCOUNT_ADDRESS);
    expect(response2.contractAddress.toLowerCase()).toBe(assetContractAddress);
    expect(response2.amount.toString()).toBe("0");
    log.info("Unlocked 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput.toString()).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalanceOwner = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [WHALE_ACCOUNT_ADDRESS],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput.toString()).toBe("100");
    log.info("Amount was transfer correctly from the Wrapper account");
  });

  it("Should Burn a token", async () => {
    const responseApprove = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [wrapperContractAddress, "100"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseApprove).toBeTruthy();
    expect(responseApprove.success).toBeTruthy();
    log.info("Approved 100 tokens to SATPWrapperContract");

    const response = await ethereumBridge.lockAsset(ETH_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Locked 100 tokens successfully");

    const response2 = await ethereumBridge.burnAsset(ETH_ASSET_ID, 100);
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info("Burned 100 tokens successfully");

    const response3 = await ethereumBridge.getAsset(ETH_ASSET_ID);
    expect(response3).toBeDefined();
    expect(response3.tokenId).toBe(ETH_ASSET_ID);
    expect(response3.tokenType.toString().replace("o", "")).toBe(
      TokenType.NONSTANDARD.toString(),
    );
    expect(response3.owner.toLowerCase()).toBe(WHALE_ACCOUNT_ADDRESS);
    expect(response3.contractAddress.toLowerCase()).toBe(assetContractAddress);
    expect(response3.amount.toString()).toBe("0");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput.toString()).toBe("0");
    log.info("Amount was burned correctly to the Wrapper account");
  });

  it("Should Mint a token", async () => {
    const response = await ethereumBridge.mintAsset(ETH_ASSET_ID, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Minted 100 tokens successfully");

    const response2 = await ethereumBridge.getAsset(ETH_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(ETH_ASSET_ID);
    expect(response2.tokenType.toString().replace("o", "")).toBe(
      TokenType.NONSTANDARD.toString(),
    );
    expect(response2.owner.toLowerCase()).toBe(WHALE_ACCOUNT_ADDRESS);
    expect(response2.contractAddress.toLowerCase()).toBe(assetContractAddress);
    expect(response2.amount.toString()).toBe("100");
    log.info("Minted 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput.toString()).toBe("100");
    log.info("Amount was minted correctly to the Wrapper account");
  });

  it("Should Assign a token", async () => {
    const response = await ethereumBridge.assignAsset(
      ETH_ASSET_ID,
      assigneeEthAccount,
      100,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Assigned 100 tokens successfully");

    const response2 = await ethereumBridge.getAsset(ETH_ASSET_ID);
    expect(response2).toBeDefined();
    expect(response2.tokenId).toBe(ETH_ASSET_ID);
    expect(response2.tokenType.toString().replace("o", "")).toBe(
      TokenType.NONSTANDARD.toString(),
    );
    expect(response2.contractAddress.toLowerCase()).toBe(assetContractAddress);
    expect(response2.amount.toString()).toBe("0");
    log.info("Assigned 100 tokens successfully");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput.toString()).toBe("0");
    log.info("Amount was assigned correctly to the Wrapper account");

    const responseBalanceOwner = await testing_connector.invokeContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [assigneeEthAccount],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput.toString()).toBe("100");
    log.info("Amount was assigned correctly to the Assignee account");
  });

  it("Should Unwrap a token", async () => {
    const response = await ethereumBridge.unwrapAsset(ETH_ASSET_ID);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumBridge.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped 100 tokens successfully");
  });
});
