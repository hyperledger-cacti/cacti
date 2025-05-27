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
import { EvmFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { BesuLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";

let ontologyManager: OntologyManager;

let asset: EvmFungibleAsset;

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
    const erc20TokenContract = "SATPContract";

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    ontologyManager = new OntologyManager({
      logLevel,
      ontologiesPath: ontologiesPath,
    });

    besuEnv = await BesuTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      logLevel,
    });
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);

    await besuEnv.mintTokens("100");
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
    expect(besuLeaf.getDeployFungibleWrapperContractReceipt()).toBeDefined();
  });

  it("Should return the wrapper contract address", async () => {
    const wrapperContractAddress = await besuLeaf.getApproveAddress(
      TokenType.NONSTANDARD_FUNGIBLE,
    );
    expect(wrapperContractAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(wrapperContractAddress);

    await besuEnv.approveAmount(wrapperContractAddress, "100");
  });

  it("Should Wrap a token", async () => {
    asset = {
      id: besuEnv.defaultAsset.id,
      referenceId: besuEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      owner: besuEnv.defaultAsset.owner,
      contractName: besuEnv.defaultAsset.contractName,
      contractAddress: besuEnv.defaultAsset.contractAddress!,
      amount: "100",
      network: {
        id: BesuTestEnvironment.BESU_NETWORK_ID,
        ledgerType: LedgerType.Besu2X,
      },
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
    expect(response3.contractAddress).toBe(besuEnv.assetContractAddress);
    expect(response3.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response3.amount).toBe("0");
  });

  it("Should Lock a token", async () => {
    const response = await besuLeaf.lockAsset(asset.id, 100);
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
    expect(response2.amount).toBe("100");
    log.info("Locked 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("FUNGIBLE"),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const response = await besuLeaf.unlockAsset(asset.id, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response2.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response2.amount).toBe("0");
    log.info("Unlocked 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("FUNGIBLE"),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");
  });

  it("Should Burn a token", async () => {
    const wrapperContractAddress =
      await besuLeaf.getWrapperContract("FUNGIBLE");

    await besuEnv.approveAmount(wrapperContractAddress, "100");

    const response = await besuLeaf.lockAsset(asset.id, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Locked 100 tokens successfully");

    const response2 = await besuLeaf.burnAsset(asset.id, 100);
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    log.info("Burned 100 tokens successfully");

    const response3 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner).toBe(asset.owner);
    expect(response3.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response3.contractName).toBe(besuEnv.defaultAsset.contractName);
    expect(response3.amount).toBe("0");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("FUNGIBLE"),
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

    log.info("Amount was burned correctly to the Wrapper account");
  });

  it("Should Mint a token", async () => {
    const response = await besuLeaf.mintAsset(asset.id, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Minted 100 tokens successfully");

    const response2 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response2.amount).toBe("100");
    log.info("Minted 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("FUNGIBLE"),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was minted correctly to the Wrapper account");
  });

  it("Should Assign a token", async () => {
    const response = await besuLeaf.assignAsset(asset.id, asset.owner, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Assigned 100 tokens successfully");

    const response2 = (await besuLeaf.getAsset(asset.id)) as EvmFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner).toBe(asset.owner);
    expect(response2.contractAddress).toBe(besuEnv.getTestContractAddress());
    expect(response2.amount).toBe("0");
    log.info("Assigned 100 tokens successfully");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuLeaf.getWrapperContract("FUNGIBLE"),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was removed correctly form the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
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
