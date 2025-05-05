import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { TokenType } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { WHALE_ACCOUNT_ADDRESS } from "@hyperledger/cactus-test-geth-ledger";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { EthereumLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/ethereum-leaf";
import path from "path";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { EthereumTestEnvironment } from "../../test-utils";
import { EvmFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";

let ontologyManager: OntologyManager;

let asset: EvmFungibleAsset;

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let ethereumLeaf: EthereumLeaf;
let ethereumEnv: EthereumTestEnvironment;

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
    const erc20TokenContract = "SATPContract";

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    ontologyManager = new OntologyManager({
      logLevel,
      ontologiesPath: ontologiesPath,
    });

    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      logLevel,
    });
    log.info("Ethereum Ledger started successfully");

    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);

    await ethereumEnv.mintTokens("100");
  }
});

afterAll(async () => {
  await ethereumEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("Ethereum Leaf Test", () => {
  it("Should Initialize the Leaf", async () => {
    ethereumLeaf = new EthereumLeaf(
      ethereumEnv.createEthereumLeafConfig(ontologyManager, "DEBUG"),
    );
    expect(ethereumLeaf).toBeDefined();
  });
  it("Should deploy Wrapper Smart Contract", async () => {
    await ethereumLeaf.deployContracts();
    expect(
      ethereumLeaf.getDeployFungibleWrapperContractReceipt(),
    ).toBeDefined();
  });

  it("Should return the wrapper contract address", async () => {
    const wrapperContractAddress =
      await ethereumLeaf.getWrapperContract("FUNGIBLE");
    expect(wrapperContractAddress).toBeDefined();

    await ethereumEnv.giveRoleToBridge(wrapperContractAddress);

    await ethereumEnv.approveAmount(wrapperContractAddress, "100");
  });
  it("Should Wrap a token", async () => {
    asset = {
      id: ethereumEnv.defaultAsset.id,
      referenceId: ethereumEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      owner: WHALE_ACCOUNT_ADDRESS,
      contractName: ethereumEnv.defaultAsset.contractName,
      contractAddress: ethereumEnv.defaultAsset.contractAddress!,
      amount: "100",
      network: {
        id: EthereumTestEnvironment.ETH_NETWORK_ID,
        ledgerType: LedgerType.Ethereum,
      },
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
      ethereumEnv.assetContractAddress,
    );
    expect(response3.contractName).toBe(ethereumEnv.defaultAsset.contractName);
    // expect(response3.tokenType.toString().replace("o", "")).toBe(
    //   TokenType.NONSTANDARD.toString(),
    // );
  });

  it("Should Lock a token", async () => {
    const response = await ethereumLeaf.lockAsset(asset.id, 100);
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
      ethereumEnv.assetContractAddress,
    );
    expect(response2.contractName).toBe(ethereumEnv.defaultAsset.contractName);
    expect(response2.amount.toString()).toBe("100");
    log.info("Locked 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumLeaf.getWrapperContract("FUNGIBLE"),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const response = await ethereumLeaf.unlockAsset(asset.id, 100);
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
      ethereumEnv.getTestContractAddress(),
    );
    expect(response2.contractName).toBe(ethereumEnv.getTestContractName());
    expect(response2.amount.toString()).toBe("0");
    log.info("Unlocked 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumLeaf.getWrapperContract("FUNGIBLE"),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");
    log.info("Amount was transfer correctly from the Wrapper account");
  });

  it("Should Burn a token", async () => {
    const wrapperContractAddress =
      await ethereumLeaf.getWrapperContract("FUNGIBLE");

    await ethereumEnv.approveAmount(wrapperContractAddress, "100");

    const response = await ethereumLeaf.lockAsset(asset.id, 100);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Locked 100 tokens successfully");

    const response2 = await ethereumLeaf.burnAsset(asset.id, 100);
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
      ethereumEnv.getTestContractAddress(),
    );
    expect(response3.contractName).toBe(ethereumEnv.defaultAsset.contractName);
    expect(response3.amount.toString()).toBe("0");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumLeaf.getWrapperContract("FUNGIBLE"),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was burned correctly to the Wrapper account");
  });

  it("Should Mint a token", async () => {
    const response = await ethereumLeaf.mintAsset(asset.id, 100);
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
      ethereumEnv.getTestContractAddress(),
    );
    expect(response2.amount.toString()).toBe("100");
    log.info("Minted 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumLeaf.getWrapperContract("FUNGIBLE"),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was minted correctly to the Wrapper account");
  });

  it("Should Assign a token", async () => {
    const response = await ethereumLeaf.assignAsset(
      asset.id,
      ethereumEnv.getTestOwnerAccount(),
      100,
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
      ethereumEnv.getTestContractAddress(),
    );
    expect(response2.amount.toString()).toBe("0");
    log.info("Assigned 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumLeaf.getWrapperContract("FUNGIBLE"),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was assigned correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
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
