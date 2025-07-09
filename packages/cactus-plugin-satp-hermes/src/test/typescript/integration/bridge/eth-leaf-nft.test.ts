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
import { EvmNonFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { UniqueTokenID } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/asset";

let ontologyManager: OntologyManager;

let asset: EvmNonFungibleAsset;

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
    const erc721TokenContract = "SATPNFTokenContract";
    const erc20TokenContract = "SATPTokenContract";

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    ontologyManager = new OntologyManager({
      logLevel,
      ontologiesPath: ontologiesPath,
    });

    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      contractName2: erc721TokenContract,
      logLevel,
    });
    log.info("Ethereum Ledger started successfully");

    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);

    await ethereumEnv.mintNonFungible("1001");
  }
}, TIMEOUT);

afterAll(async () => {
  await ethereumEnv.tearDown();

  await ethereumLeaf.shutdownConnection().catch((err) => {
    log.error("Error shutting down Ethereum Leaf connector:", err);
    fail("Error shutting down Ethereum Leaf connector");
  });

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

describe("Ethereum Leaf Test", () => {
  //jest.setTimeout(20000);
  jest.setTimeout(40000);

  it("Should Initialize the Leaf", async () => {
    ethereumLeaf = new EthereumLeaf(
      ethereumEnv.createEthereumLeafConfig(ontologyManager, "DEBUG"),
    );
    expect(ethereumLeaf).toBeDefined();
  });

  it("Should deploy Wrapper Smart Contract", async () => {
    await ethereumLeaf.deployContracts();
    expect(ethereumLeaf.getDeployWrapperContractReceipt()).toBeDefined();
  });

  it("Should return the wrapper contract address", async () => {
    const wrapperContractAddress =
      await ethereumLeaf.getWrapperContract("NONFUNGIBLE");
    expect(wrapperContractAddress).toBeDefined();

    await ethereumEnv.giveRoleToBridge(wrapperContractAddress);
    await ethereumEnv.approveAsset(wrapperContractAddress, "1001");
  });
  it("Should Wrap a token", async () => {
    asset = {
      id: ethereumEnv.nonFungibleDefaultAsset.id,
      referenceId: ethereumEnv.nonFungibleDefaultAsset.referenceId,
      type: TokenType.NONSTANDARD_NONFUNGIBLE,
      owner: WHALE_ACCOUNT_ADDRESS,
      contractName: ethereumEnv.nonFungibleDefaultAsset.contractName,
      contractAddress: ethereumEnv.nonFungibleDefaultAsset.contractAddress!,
      uniqueDescriptor: 1001 as UniqueTokenID,
      network: {
        id: EthereumTestEnvironment.ETH_NETWORK_ID,
        ledgerType: LedgerType.Ethereum,
      },
    } as EvmNonFungibleAsset;

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
    expect(response3.owner.toLowerCase()).toBe(asset.owner.toLowerCase());
    expect(response3.contractAddress.toLowerCase()).toBe(
      ethereumEnv.nftContractAddress,
    );
    expect(response3.contractName).toBe(
      ethereumEnv.nonFungibleDefaultAsset.contractName,
    );
    expect(response3.type.toString().replace("o", "")).toBe(
      TokenType.NONSTANDARD_NONFUNGIBLE.toString(),
    );
  });

  it("Should Lock a token", async () => {
    //const t = await ethereumLeaf.getAsset(asset.id);
    //console.log("\n\ntoken:" + (t as EvmNonFungibleAsset) + "\n");
    //console.log("WhaleAddress: " + WHALE_ACCOUNT_ADDRESS);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNFTContractName(),
      ethereumEnv.getTestNFTContractAddress(),
      ethereumEnv.getTestNFTContractAbi(),
      ethereumLeaf.getWrapperContract("NONFUNGIBLE"),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT not in wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNFTContractName(),
      ethereumEnv.getTestNFTContractAddress(),
      ethereumEnv.getTestNFTContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT in owner account");

    const response = await ethereumLeaf.lockAsset(
      asset.id,
      asset.uniqueDescriptor,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.nftContractAddress.toLowerCase(),
    );
    expect(response2.contractName).toBe(
      ethereumEnv.nonFungibleDefaultAsset.contractName,
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      1001 as UniqueTokenID,
    );
    log.info("Locked nft 1001 successfully");
    console.log(typeof response2.uniqueDescriptor);
    console.log(response2.uniqueDescriptor);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNFTContractName(),
      ethereumEnv.getTestNFTContractAddress(),
      ethereumEnv.getTestNFTContractAbi(),
      ethereumLeaf.getWrapperContract("NONFUNGIBLE"),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT was transferred correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNFTContractName(),
      ethereumEnv.getTestNFTContractAddress(),
      ethereumEnv.getTestNFTContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT was transferred correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    console.log("\n\nON UNLOCK\n\n");
    (await ethereumLeaf.getAsset(asset.id)) as EvmNonFungibleAsset;
    const response = await ethereumLeaf.unlockAsset(
      asset.id,
      1001 as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNFTContractAddress(),
    );
    expect(response2.contractName).toBe(ethereumEnv.getTestNFTContractName());
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      0 as UniqueTokenID,
    );
    log.info("Unlocked NFT successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNFTContractName(),
      ethereumEnv.getTestNFTContractAddress(),
      ethereumEnv.getTestNFTContractAbi(),
      ethereumLeaf.getWrapperContract("NONFUNGIBLE"),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNFTContractName(),
      ethereumEnv.getTestNFTContractAddress(),
      ethereumEnv.getTestNFTContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Wrapper account");
    log.info("Amount was transfer correctly back to Owner account");
  });

  it("Should Burn a token", async () => {
    //const wrapperContractAddress =
    //await ethereumLeaf.getWrapperContract("NONFUNGIBLE");

    //await ethereumEnv.approveAsset(wrapperContractAddress, "1001");

    const response = await ethereumLeaf.lockAsset(
      asset.id,
      asset.uniqueDescriptor,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    //log.info("Locked 100 tokens successfully");

    const response2 = await ethereumLeaf.burnAsset(
      asset.id,
      1001 as UniqueTokenID,
    );
    expect(response2).toBeDefined();
    expect(response2.transactionId).toBeDefined();
    expect(response2.transactionReceipt).toBeDefined();
    //log.info("Burned 100 tokens successfully");

    const response3 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.type).toBe(asset.type);
    expect(response3.owner.toLowerCase()).toBe(asset.owner);
    expect(response3.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNFTContractAddress(),
    );
    expect(response3.contractName).toBe(
      ethereumEnv.nonFungibleDefaultAsset.contractName,
    );
    expect(response3.uniqueDescriptor).toBe(0 as UniqueTokenID); //Need to check what happens after the burn

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumLeaf.getWrapperContract("NONFUNGIBLE"),
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
    log.info("NFT was burned correctly to the Wrapper account");
  });

  it("Should Mint a token", async () => {
    const response = await ethereumLeaf.mintAsset(
      asset.id,
      1002 as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Minted token 1002 successfully");

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestNFTContractAddress().toLowerCase(),
    );
    expect(response2.uniqueDescriptor as UniqueTokenID).toBe(
      1002 as UniqueTokenID,
    );
    log.info("Minted token 1002 successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNFTContractName(),
      ethereumEnv.getTestNFTContractAddress(),
      ethereumEnv.getTestNFTContractAbi(),
      ethereumLeaf.getWrapperContract("NONFUNGIBLE"),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("NFT was minted correctly to the Wrapper account");
    await ethereumLeaf.burnAsset(asset.id, 1002 as UniqueTokenID);
  });

  it("Should Assign a token", async () => {
    const response = await ethereumLeaf.assignAsset(
      asset.id,
      ethereumEnv.getTestOwnerAccount(),
      1001 as UniqueTokenID,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    //log.info("Assigned 100 tokens successfully");

    const response2 = (await ethereumLeaf.getAsset(
      asset.id,
    )) as EvmNonFungibleAsset;
    expect(response2).toBeDefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.type).toBe(asset.type);
    expect(response2.owner.toLowerCase()).toBe(asset.owner);
    expect(response2.contractAddress.toLowerCase()).toBe(
      ethereumEnv.getTestContractAddress(),
    );
    expect(response2.uniqueDescriptor).toBe("0");
    log.info("Assigned 100 tokens successfully");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumLeaf.getWrapperContract("NONFUNGIBLE"),
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
