import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import path from "path";
import { TokenType } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BesuTestEnvironment } from "../../test-utils";
import { EvmNonFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { BesuLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { UniqueTokenID } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/asset";

let ontologyManager: OntologyManager;

let asset: EvmNonFungibleAsset;

const uniqueTokenId: string = "1001";
const uniqueTokenId2: string = "1002";

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
    const erc721TokenContract = "SATPNonFungibleTokenContract";

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    ontologyManager = new OntologyManager({
      logLevel,
      ontologiesPath: ontologiesPath,
    });

    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      {
        contractName: erc721TokenContract,
        logLevel,
      },
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);

    await besuEnv.mintTokens(uniqueTokenId);
  }
}, TIMEOUT);

afterAll(async () => {
  await besuEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

describe("Besu Leaf Test", () => {
  jest.setTimeout(20000);
  it("Should Initialize the Leaf", async () => {
    besuLeaf = new BesuLeaf(
      besuEnv.createBesuLeafConfig(ontologyManager, "DEBUG"),
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
      TokenType.NONSTANDARD_NONFUNGIBLE,
    );
    expect(wrapperContractAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(wrapperContractAddress);

    await besuEnv.approveAmount(wrapperContractAddress, uniqueTokenId);
  });

  it("Should Wrap a token", async () => {
    asset = {
      id: besuEnv.defaultAsset.id,
      referenceId: besuEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_NONFUNGIBLE,
      owner: besuEnv.defaultAsset.owner,
      contractName: besuEnv.defaultAsset.contractName,
      contractAddress: besuEnv.defaultAsset.contractAddress!,
      uniqueDescriptor: uniqueTokenId, // Ensure this is a string or number as expected by the contract
      network: {
        id: BesuTestEnvironment.BESU_NETWORK_ID,
        ledgerType: LedgerType.Besu2X,
      },
    } as EvmNonFungibleAsset;

    console.log(
      "\n\n\n\n\nAsset to wrap: " +
        JSON.stringify(asset, null, 2) +
        "\n\n\n\n\n",
    );

    const response = await besuLeaf.wrapAsset(asset);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(asset.id);

    const response3 = (await besuLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner).toBe(asset.owner);
    expect(response3.contractAddress).toBe(besuEnv.assetContractAddress);
    expect(response3.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response3.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
  });

  it("Should Lock a token", async () => {
    const response = await besuLeaf.lockAsset(
      asset.id,
      Number(uniqueTokenId) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await besuLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(asset.contractAddress);
    expect(response2.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      Number(uniqueTokenId) as UniqueTokenID,
    );
    log.info(`Locked token ${uniqueTokenId} successfully`);

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("NONFUNGIBLE"),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT was transfer correctly to the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const response = await besuLeaf.unlockAsset(
      asset.id,
      Number(uniqueTokenId) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await besuLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response2.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
    log.info(`Unlocked token ${uniqueTokenId} successfully`);

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("NONFUNGIBLE"),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT was transfer correctly from the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT was transfer correctly to the Owner account");
  });

  it("Should Burn a token", async () => {
    const wrapperContractAddress =
      await besuLeaf.getWrapperContract("NONFUNGIBLE");

    await besuEnv.approveToken(wrapperContractAddress, uniqueTokenId);

    const response = await besuLeaf.lockAsset(
      asset.id,
      Number(uniqueTokenId) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Locked token ${uniqueTokenId} successfully`);

    const response2 = await besuLeaf.burnAsset(
      asset.id,
      Number(uniqueTokenId) as UniqueTokenID,
    );
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info(`Burned token ${uniqueTokenId} successfully`);

    const response3 = (await besuLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner).toBe(asset.owner);
    expect(response3.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response3.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response3.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("NONFUNGIBLE"),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );

    log.info(
      `Token ${uniqueTokenId} was burned correctly to the Wrapper account`,
    );
  });

  it("Should Mint a token", async () => {
    const response = await besuLeaf.mintAsset(
      asset.id,
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Minted token ${uniqueTokenId2} successfully`);

    const response2 = (await besuLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    log.info(`Minted token ${uniqueTokenId} successfully`);

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("NONFUNGIBLE"),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId} was minted correctly to the Wrapper account`,
    );
  });

  it("Should Assign a token", async () => {
    const response = await besuLeaf.assignAsset(
      asset.id,
      asset.owner,
      Number(uniqueTokenId2) as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info(`Assigned token ${uniqueTokenId} successfully`);

    const response2 = (await besuLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
    log.info(`Assigned token ${uniqueTokenId} successfully`);

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("NONFUNGIBLE"),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId} was removed correctly form the Wrapper account`,
    );

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId} was assigned correctly to the Assignee account`,
    );
  });

  it("Should Unwrap a token", async () => {
    const response = await besuLeaf.unwrapAsset(asset.id);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = await besuLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped non fungible token successfully");
  });
});
