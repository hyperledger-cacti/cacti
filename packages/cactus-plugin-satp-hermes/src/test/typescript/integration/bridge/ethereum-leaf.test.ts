import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  TokenType,
  ERCTokenStandard,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { WHALE_ACCOUNT_ADDRESS } from "@hyperledger/cactus-test-geth-ledger";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { EthereumLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/ethereum-leaf";
import path from "path";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { EthereumTestEnvironment } from "../../test-utils";
import {
  EvmFungibleAsset,
  EvmNonFungibleAsset,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import {
  Amount,
  UniqueTokenID,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/asset";
import { SupportedContractTypes } from "../../environments/ethereum-test-environment";

let ontologyManager: OntologyManager;

let asset: EvmFungibleAsset;
let nonFungibleAsset: EvmNonFungibleAsset;

const uniqueTokenId1: string = "1001";
const uniqueTokenId2: string = "1002";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let ethereumLeaf: EthereumLeaf;
let ethereumEnv: EthereumTestEnvironment;
const TIMEOUT = 60000;

beforeAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  {
    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    ontologyManager = new OntologyManager(
      {
        logLevel,
        ontologiesPath: ontologiesPath,
      },
      monitorService,
    );

    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      {
        logLevel,
      },
      [
        {
          assetType: SupportedContractTypes.FUNGIBLE,
          contractName: "SATPContract",
        },
        {
          assetType: SupportedContractTypes.NONFUNGIBLE,
          contractName: "SATPContract2",
        },
      ],
    );
    log.info("Ethereum Ledger started successfully");

    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);

    await ethereumEnv.mintTokens("100", TokenType.NONSTANDARD_FUNGIBLE);
    await ethereumEnv.mintTokens("1001", TokenType.NONSTANDARD_NONFUNGIBLE);
  }
}, TIMEOUT);

afterAll(async () => {
  await ethereumEnv.tearDown();

  await ethereumLeaf.shutdownConnection().catch((err) => {
    log.error("Error shutting down Ethereum Leaf connector:", err);
    fail("Error shutting down Ethereum Leaf connector");
  });

  await monitorService.shutdown();

  log.info("Ethereum Leaf connector shutdown successfully");

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

describe("Ethereum Leaf Test with Fungible Tokens", () => {
  jest.setTimeout(20000);
  it("Should Initialize the Leaf", async () => {
    ethereumLeaf = new EthereumLeaf(
      ethereumEnv.createEthereumLeafConfig(ontologyManager, "DEBUG"),
      ontologyManager,
      monitorService,
    );
    expect(ethereumLeaf).toBeDefined();
  });

  it("Should deploy Wrapper Smart Contract", async () => {
    await ethereumLeaf.deployContracts();
    expect(ethereumLeaf.getDeployWrapperContractReceipt()).toBeDefined();
  });

  it("Should return the wrapper contract address", async () => {
    const wrapperContractAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );
    expect(wrapperContractAddress).toBeDefined();

    await ethereumEnv.giveRoleToBridge(wrapperContractAddress);

    await ethereumEnv.approveAssets(
      wrapperContractAddress,
      "100",
      TokenType.NONSTANDARD_FUNGIBLE,
    );
  });

  it("Should fetch the contract bytecode, which should be the same as the one in the respective ontology", async () => {
    const fungibleAssetContractAddress =
      await ethereumEnv.getTestFungibleContractAddress();

    const response = await ethereumLeaf.getContractBytecode(
      fungibleAssetContractAddress,
    );
    expect(response).toBeDefined();

    const response2 = await ontologyManager.checkOntologyBytecode(
      LedgerType.Ethereum,
      "SATP-ERC20-ETHEREUM",
      fungibleAssetContractAddress,
      ethereumLeaf,
    );
    expect(response2).toBe(true);
  });

  it("Should Wrap a token", async () => {
    asset = {
      id: ethereumEnv.defaultAsset.id,
      referenceId: ethereumEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      owner: WHALE_ACCOUNT_ADDRESS,
      contractName: ethereumEnv.defaultAsset.contractName,
      contractAddress: ethereumEnv.defaultAsset.contractAddress!,
      amount: Number(100) as Amount,
      network: {
        id: EthereumTestEnvironment.ETH_NETWORK_ID,
        ledgerType: LedgerType.Ethereum,
      },
      ercTokenStandard: ERCTokenStandard.ERC_TOKEN_STANDARD_ERC20,
    } as EvmFungibleAsset;

    const response = await ethereumLeaf.wrapAsset(asset);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(asset.id);

    const response3 = await ethereumLeaf.getAsset(asset.id);
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner.toLowerCase()).toBe(asset.owner);
    expect(response3.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestFungibleContractAddress(),
    );
    expect(response3.contractName).toBe(ethereumEnv.defaultAsset.contractName);
    // expect(response3.tokenType.toString().replace("o", "")).toBe(
    //   TokenType.NONSTANDARD.toString(),
    // );
  });

  it("Should Lock a token", async () => {
    const response = await ethereumLeaf.lockAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestFungibleContractAddress(),
    );
    expect(response2.contractName).toBe(ethereumEnv.defaultAsset.contractName);
    expect(response2.amount).toBe(100 as Amount);
    log.info("Locked 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const response = await ethereumLeaf.unlockAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestFungibleContractAddress(),
    );
    expect(response2.contractName).toBe(
      ethereumEnv.getTestFungibleContractName(),
    );
    expect(response2.amount).toBe(0 as Amount);
    log.info("Unlocked 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");
    log.info("Amount was transfer correctly from the Wrapper account");
  });

  it("Should Burn a token", async () => {
    const wrapperContractAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );

    await ethereumEnv.approveAssets(
      wrapperContractAddress,
      "100",
      TokenType.NONSTANDARD_FUNGIBLE,
    );

    const response = await ethereumLeaf.lockAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Locked 100 tokens successfully");

    const response2 = await ethereumLeaf.burnAsset(asset.id, 100 as Amount);
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info("Burned 100 tokens successfully");

    const response3 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner.toLowerCase()).toBe(asset.owner);
    expect(response3.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestFungibleContractAddress(),
    );
    expect(response3.contractName).toBe(ethereumEnv.defaultAsset.contractName);
    expect(response3.amount).toBe(0 as Amount);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was burned correctly to the Wrapper account");
  });

  it("Should Mint a token", async () => {
    const response = await ethereumLeaf.mintAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Minted 100 tokens successfully");

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestFungibleContractAddress(),
    );
    expect(response2.amount).toBe(100 as Amount);
    log.info("Minted 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was minted correctly to the Wrapper account");
  });

  it("Should Assign a token", async () => {
    const response = await ethereumLeaf.assignAsset(
      asset.id,
      ethereumEnv.getTestOwnerAccount(),
      100 as Amount,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Assigned 100 tokens successfully");

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestFungibleContractAddress(),
    );
    expect(response2.amount).toBe(0 as Amount);
    log.info("Assigned 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was assigned correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was assigned correctly to the Assignee account");
  });

  it("Should Unwrap a token", async () => {
    const response = await ethereumLeaf.unwrapAsset(asset.id);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped 100 tokens successfully");
  });
});

describe("Ethereum Leaf Non Fungible Test", () => {
  jest.setTimeout(20000);
  it("Should Initialize the Leaf", async () => {
    ethereumLeaf = new EthereumLeaf(
      ethereumEnv.createEthereumLeafConfig(ontologyManager, "DEBUG"),
      ontologyManager,
      monitorService,
    );
    expect(ethereumLeaf).toBeDefined();
  });

  it("Should deploy Wrapper Smart Contract", async () => {
    await ethereumLeaf.deployContracts();
    expect(ethereumLeaf.getDeployWrapperContractReceipt()).toBeDefined();
  });

  it("Should return the wrapper contract address", async () => {
    const wrapperContractAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
    expect(wrapperContractAddress).toBeDefined();

    await ethereumEnv.giveRoleToBridge(wrapperContractAddress);
  });
  it("Should fetch the contract bytecode, which should be the same as the one in the respective ontology", async () => {
    const nonFungibleAssetContractAddress =
      await ethereumEnv.getTestNonFungibleContractAddress();

    const response = await ethereumLeaf.getContractBytecode(
      nonFungibleAssetContractAddress,
    );
    expect(response).toBeDefined();

    const response2 = await ontologyManager.checkOntologyBytecode(
      LedgerType.Ethereum,
      "SATP-ERC721-ETHEREUM",
      nonFungibleAssetContractAddress,
      ethereumLeaf,
    );
    expect(response2).toBe(true);
  });
  it("Should Wrap a token", async () => {
    nonFungibleAsset = {
      id: ethereumEnv.nonFungibleDefaultAsset.id,
      referenceId: ethereumEnv.nonFungibleDefaultAsset.referenceId,
      type: TokenType.NONSTANDARD_NONFUNGIBLE,
      owner: WHALE_ACCOUNT_ADDRESS,
      contractName: ethereumEnv.nonFungibleDefaultAsset.contractName,
      contractAddress: ethereumEnv.nonFungibleDefaultAsset.contractAddress!,
      uniqueDescriptor: Number(uniqueTokenId1) as UniqueTokenID,
      network: {
        id: EthereumTestEnvironment.ETH_NETWORK_ID,
        ledgerType: LedgerType.Ethereum,
      },
      ercTokenStandard: ERCTokenStandard.ERC_TOKEN_STANDARD_ERC721,
    } as EvmNonFungibleAsset;

    const response = await ethereumLeaf.wrapAsset(nonFungibleAsset);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(nonFungibleAsset.id);

    const response3 = await ethereumLeaf.getAsset(nonFungibleAsset.id);
    expect(response3).toBeDefined();
    expect(response3.id).toBe(nonFungibleAsset.id);
    expect(response3.type).toBe(nonFungibleAsset.type);
    expect(response3.owner.toLowerCase()).toBe(
      nonFungibleAsset.owner.toLowerCase(),
    );
    expect(response3.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNonFungibleContractAddress().toLowerCase(),
    );
    expect(response3.contractName).toBe(
      ethereumEnv.nonFungibleDefaultAsset.contractName,
    );

    log.info(`Non Fungible Asset Token contract wrapped successfully`);
  });

  it("Should Approve a token", async () => {
    await ethereumEnv.approveAssets(
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "1001",
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
  });

  it("Should Lock a token", async () => {
    const response = await ethereumLeaf.lockAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await ethereumLeaf.getAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner.toLowerCase()).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNonFungibleContractAddress().toLowerCase(),
    );
    expect(response2.contractName).toBe(
      ethereumEnv.getTestNonFungibleContractName(),
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    log.info(`Locked token${uniqueTokenId1} successfully`);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly to the Wrapper account",
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly from the Owner account",
    );
  });

  it("Should Unlock a token", async () => {
    const response = await ethereumLeaf.unlockAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await ethereumLeaf.getAsset(
      nonFungibleAsset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner.toLowerCase()).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNonFungibleContractAddress().toLowerCase(),
    );
    expect(response2.contractName).toBe(
      ethereumEnv.getTestNonFungibleContractName(),
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
    log.info(`Unlocked token ${uniqueTokenId1} successfully`);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly from the Wrapper account",
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly to the Owner account",
    );
  });

  it("Should Burn a token", async () => {
    await ethereumEnv.approveAssets(
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      uniqueTokenId1,
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
    const response = await ethereumLeaf.lockAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Locked token ${uniqueTokenId1} successfully`);

    const response2 = await ethereumLeaf.burnAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info(`Burned token ${uniqueTokenId1} successfully`);

    const response3 = (await ethereumLeaf.getAsset(
      nonFungibleAsset.id,
    )) as EvmNonFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(nonFungibleAsset.id);
    expect(response3.type).toBe(nonFungibleAsset.type);
    expect(response3.owner.toLowerCase()).toBe(nonFungibleAsset.owner);
    expect(response3.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNonFungibleContractAddress().toLowerCase(),
    );
    expect(response3.contractName).toBe(
      ethereumEnv.nonFungibleDefaultAsset.contractName,
    );
    expect(response3.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );

    log.info(
      `Token ${uniqueTokenId1} was burned correctly from the Wrapper account`,
    );
  });

  it("Should Mint a token", async () => {
    const response = await ethereumLeaf.mintAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Minted token ${uniqueTokenId2} successfully`);

    const response2 = (await ethereumLeaf.getAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId2) as UniqueTokenID,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner.toLowerCase()).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNonFungibleContractAddress().toLowerCase(),
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    log.info(`Minted token ${uniqueTokenId2} successfully`);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId2} was minted correctly to the Wrapper account`,
    );
  });

  it("Should Assign a token", async () => {
    const response = await ethereumLeaf.assignAsset(
      nonFungibleAsset.id,
      nonFungibleAsset.owner,
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Assigned token ${uniqueTokenId2} successfully to default owner`);

    const response2 = (await ethereumLeaf.getAsset(
      nonFungibleAsset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner.toLowerCase()).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNonFungibleContractAddress(),
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
    log.info(
      `Assigned token ${uniqueTokenId2} successfully from wrapper account`,
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId2} was removed correctly form the Wrapper account`,
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId2} was assigned correctly to the owner account`,
    );
  });

  it("Should Unwrap a token", async () => {
    const response = await ethereumLeaf.unwrapAsset(nonFungibleAsset.id);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await ethereumLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped Non Fungible Token successfully");
  });
});
