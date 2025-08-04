import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import path from "path";
import {
  TokenType,
  ERCTokenStandard,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BesuTestEnvironment } from "../../test-utils";
import {
  EvmFungibleAsset,
  EvmNonFungibleAsset,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { BesuLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import {
  Amount,
  UniqueTokenID,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/asset";
import { SupportedContractTypes } from "../../environments/besu-test-environment";

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

let besuLeaf: BesuLeaf;
let besuEnv: BesuTestEnvironment;
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

    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
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
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);

    await besuEnv.mintTokens("100", TokenType.NONSTANDARD_FUNGIBLE);
    await besuEnv.mintTokens(uniqueTokenId1, TokenType.NONSTANDARD_NONFUNGIBLE);
  }
}, TIMEOUT);

afterAll(async () => {
  await besuEnv.tearDown();

  await monitorService.shutdown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

describe("Besu Leaf Test with Fungible Tokens", () => {
  jest.setTimeout(20000);
  it("Should Initialize the Leaf", async () => {
    besuLeaf = new BesuLeaf(
      besuEnv.createBesuLeafConfig(ontologyManager, "DEBUG"),
      ontologyManager,
      monitorService,
    );
    expect(besuLeaf.getNetworkIdentification()).toStrictEqual({
      id: BesuTestEnvironment.BESU_NETWORK_ID,
      ledgerType: LedgerType.Besu2X,
    });
    expect(besuLeaf).toBeDefined();
  });
  it("Should deploy Wrapper Smart Contract", async () => {
    await besuLeaf.deployContracts();
    expect(besuLeaf.getDeployWrapperContractReceipt()).toBeDefined();
  });

  it("Should return the wrapper contract address", async () => {
    const wrapperContractAddress = await besuLeaf.getApproveAddress(
      TokenType.NONSTANDARD_FUNGIBLE,
    );
    expect(wrapperContractAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(wrapperContractAddress);

    await besuEnv.approveAssets(
      wrapperContractAddress,
      "100",
      TokenType.NONSTANDARD_FUNGIBLE,
    );
  });

  it("Should Wrap a token", async () => {
    asset = {
      id: besuEnv.defaultAsset.id,
      referenceId: besuEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      owner: besuEnv.defaultAsset.owner,
      contractName: besuEnv.defaultAsset.contractName,
      contractAddress: besuEnv.defaultAsset.contractAddress!,
      amount: Number(100) as Amount,
      network: {
        id: BesuTestEnvironment.BESU_NETWORK_ID,
        ledgerType: LedgerType.Besu2X,
      },
      ercTokenStandard: ERCTokenStandard.ERC_TOKEN_STANDARD_ERC721,
    } as EvmFungibleAsset;

    const response = await besuLeaf.wrapAsset(asset);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(asset.id);

    const response3 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner).toBe(asset.owner);
    expect(response3.contractAddress).toBe(
      besuEnv.getTestFungibleContractAddress(),
    );
    expect(response3.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response3.amount).toBe(0 as Amount);
  });

  it("Should Lock a token", async () => {
    const response = await besuLeaf.lockAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(asset.contractAddress);
    expect(response2.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response2.amount).toBe(100 as Amount);
    log.info("Locked 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const response = await besuLeaf.unlockAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(
      besuEnv.getTestFungibleContractAddress(),
    );
    expect(response2.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response2.amount).toBe(0 as Amount);
    log.info("Unlocked 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");
  });

  it("Should Burn a token", async () => {
    const wrapperContractAddress = await besuLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );

    await besuEnv.approveAssets(
      wrapperContractAddress,
      "100",
      TokenType.NONSTANDARD_FUNGIBLE,
    );

    const response = await besuLeaf.lockAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Locked 100 tokens successfully");

    const response2 = await besuLeaf.burnAsset(asset.id, 100 as Amount);
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info("Burned 100 tokens successfully");

    const response3 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner).toBe(asset.owner);
    expect(response3.contractAddress).toBe(
      besuEnv.getTestFungibleContractAddress(),
    );
    expect(response3.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response3.amount).toBe(0 as Amount);

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );

    log.info("Amount was burned correctly to the Wrapper account");
  });

  it("Should Mint a token", async () => {
    const response = await besuLeaf.mintAsset(asset.id, 100 as Amount);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Minted 100 tokens successfully");

    const response2 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(
      besuEnv.getTestFungibleContractAddress(),
    );
    expect(response2.amount).toBe(100 as Amount);
    log.info("Minted 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was minted correctly to the Wrapper account");
  });

  it("Should Assign a token", async () => {
    const response = await besuLeaf.assignAsset(
      asset.id,
      asset.owner,
      100 as Amount,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Assigned 100 tokens successfully");

    const response2 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(
      besuEnv.getTestFungibleContractAddress(),
    );
    expect(response2.amount).toBe(0 as Amount);
    log.info("Assigned 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was removed correctly form the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was assigned correctly to the Assignee account");
  });

  it("Should Unwrap a token", async () => {
    const response = await besuLeaf.unwrapAsset(asset.id);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped 100 tokens successfully");
  });
});

describe("Besu Leaf Test with Non Fungible Tokens", () => {
  jest.setTimeout(20000);
  it("Should Initialize the Leaf", async () => {
    besuLeaf = new BesuLeaf(
      besuEnv.createBesuLeafConfig(ontologyManager, "DEBUG"),
      ontologyManager,
      monitorService,
    );
    expect(besuLeaf.getNetworkIdentification()).toStrictEqual({
      id: BesuTestEnvironment.BESU_NETWORK_ID,
      ledgerType: LedgerType.Besu2X,
    });
    expect(besuLeaf).toBeDefined();
  });
  it("Should deploy the Wrapper Smart Contract", async () => {
    await besuLeaf.deployContracts();
    expect(besuLeaf.getDeployWrapperContractReceipt()).toBeDefined();
  });

  it("Should return the wrapper contract address", async () => {
    const wrapperContractAddress = await besuLeaf.getApproveAddress(
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
    expect(wrapperContractAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(wrapperContractAddress);
  });
  it("Should Wrap a token", async () => {
    nonFungibleAsset = {
      id: besuEnv.nonFungibleDefaultAsset.id,
      referenceId: besuEnv.nonFungibleDefaultAsset.referenceId,
      type: TokenType.NONSTANDARD_NONFUNGIBLE,
      owner: besuEnv.nonFungibleDefaultAsset.owner,
      contractName: besuEnv.nonFungibleDefaultAsset.contractName,
      contractAddress: besuEnv.nonFungibleDefaultAsset.contractAddress!,
      uniqueDescriptor: Number(uniqueTokenId1) as UniqueTokenID,
      network: {
        id: BesuTestEnvironment.BESU_NETWORK_ID,
        ledgerType: LedgerType.Besu2X,
      },
      ercTokenStandard: ERCTokenStandard.ERC_TOKEN_STANDARD_ERC721,
    } as EvmNonFungibleAsset;

    const response = await besuLeaf.wrapAsset(nonFungibleAsset);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(nonFungibleAsset.id);

    const response3 = (await besuLeaf.getAsset(
      nonFungibleAsset.id,
    )) as EvmNonFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(nonFungibleAsset.id);
    expect(response3.type).toBe(nonFungibleAsset.type);
    expect(response3.owner).toBe(nonFungibleAsset.owner);
    expect(response3.contractAddress).toBe(
      besuEnv.getTestNonFungibleContractAddress(),
    );
    expect(response3.contractName).toBe(
      besuEnv.nonFungibleDefaultAsset.contractName,
    );

    log.info(`Non Fungible Asset Token contract wrapped successfully`);
  });

  it("Should Approve a token", async () => {
    await besuEnv.approveAssets(
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      uniqueTokenId1,
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
  });

  it("Should Lock a token", async () => {
    const response = await besuLeaf.lockAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await besuLeaf.getAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress).toBe(nonFungibleAsset.contractAddress);
    expect(response2.contractName).toBe(
      besuEnv.nonFungibleDefaultAsset.contractName,
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    log.info(`Locked token ${uniqueTokenId1} successfully`);

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly to the Wrapper account",
    );

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly from the Owner account",
    );
  });

  it("Should Unlock a token", async () => {
    const response = await besuLeaf.unlockAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await besuLeaf.getAsset(
      nonFungibleAsset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress).toBe(
      besuEnv.getTestNonFungibleContractAddress(),
    );
    expect(response2.contractName).toBe(
      besuEnv.nonFungibleDefaultAsset.contractName,
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
    log.info(`Unlocked token ${uniqueTokenId1} successfully`);

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly from the Wrapper account",
    );

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      "Non Fungible Token was transferred correctly to the Owner account",
    );
  });

  it("Should Burn a token", async () => {
    await besuEnv.approveAssets(
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      uniqueTokenId1,
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
    const response = await besuLeaf.lockAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Locked token ${uniqueTokenId1} successfully`);

    const response2 = await besuLeaf.burnAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId1) as UniqueTokenID,
    );
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info(`Burned token ${uniqueTokenId1} successfully`);

    const response3 = (await besuLeaf.getAsset(
      nonFungibleAsset.id,
    )) as EvmNonFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(nonFungibleAsset.id);
    expect(response3.type).toBe(nonFungibleAsset.type);
    expect(response3.owner).toBe(nonFungibleAsset.owner);
    expect(response3.contractAddress).toBe(
      besuEnv.getTestNonFungibleContractAddress(),
    );
    expect(response3.contractName).toBe(
      besuEnv.nonFungibleDefaultAsset.contractName,
    );
    expect(response3.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );

    log.info(
      `Token ${uniqueTokenId1} was burned correctly from the Wrapper account`,
    );
  });

  it("Should Mint a token", async () => {
    const response = await besuLeaf.mintAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Minted token ${uniqueTokenId2} successfully`);

    const response2 = (await besuLeaf.getAsset(
      nonFungibleAsset.id,
      Number(uniqueTokenId2) as UniqueTokenID,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress).toBe(
      besuEnv.getTestNonFungibleContractAddress(),
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    log.info(`Minted token ${uniqueTokenId2} successfully`);

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId2} was minted correctly to the Wrapper account`,
    );
  });

  it("Should Assign a token", async () => {
    const response = await besuLeaf.assignAsset(
      nonFungibleAsset.id,
      nonFungibleAsset.owner,
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Assigned token ${uniqueTokenId2} successfully to default owner`);

    const response2 = (await besuLeaf.getAsset(
      nonFungibleAsset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(nonFungibleAsset.id);
    expect(response2.type).toBe(nonFungibleAsset.type);
    expect(response2.owner).toBe(nonFungibleAsset.owner);
    expect(response2.contractAddress).toBe(
      besuEnv.getTestNonFungibleContractAddress(),
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
    log.info(
      `Assigned token ${uniqueTokenId2} successfully from wrapper account`,
    );

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuLeaf.getWrapperContract(TokenType.NONSTANDARD_NONFUNGIBLE),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId2} was removed correctly form the Wrapper account`,
    );

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId2} was assigned correctly to the owner account`,
    );
  });

  it("Should Unwrap a token", async () => {
    const response = await besuLeaf.unwrapAsset(nonFungibleAsset.id);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped Non Fungible Token successfully");
  });
});
