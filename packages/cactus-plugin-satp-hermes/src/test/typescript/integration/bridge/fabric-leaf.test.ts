import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import "jest-extended";

import path from "path";

import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { TokenType } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { FabricTestEnvironment } from "../../test-utils";
import { FabricFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/fabric-asset";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { FabricLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/fabric-leaf";

let ontologyManager: OntologyManager;

let asset: FabricFungibleAsset;

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let fabricLeaf: FabricLeaf;
let fabricEnv: FabricTestEnvironment;

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

    fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      logLevel,
      claimFormat: ClaimFormat.DEFAULT,
    });
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts();

    await fabricEnv.mintTokens("100");
  }
});

afterAll(async () => {
  await fabricEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("Fabric Bridge Test", () => {
  it("Should Initialize the bridge", async () => {
    fabricLeaf = new FabricLeaf(
      fabricEnv.createFabricLeafConfig(ontologyManager, "DEBUG"),
    );
    expect(fabricLeaf).toBeDefined();
  });
  it("Should deploy Wrapper Smart Contract", async () => {
    await fabricLeaf.deployContracts();
    expect(fabricLeaf.getDeployFungibleWrapperContractReceipt()).toBeDefined();
  });
  it("Should return the wrapper contract name", async () => {
    const wrapperContractName = fabricLeaf.getWrapperContract("FUNGIBLE");
    expect(wrapperContractName).toBeDefined();

    await fabricEnv.giveRoleToBridge(fabricEnv.getBridgeMSPID());

    await fabricEnv.approveAmount(
      await fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
    );
  });
  it("Should Wrap a token", async () => {
    asset = {
      id: fabricEnv.defaultAsset.id,
      referenceId: fabricEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      owner: fabricEnv.clientId,
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      mspId: fabricEnv.userIdentity.mspId,
      amount: "100",
      network: {
        id: FabricTestEnvironment.FABRIC_NETWORK_ID,
        ledgerType: LedgerType.Fabric2,
      },
    } as FabricFungibleAsset;

    const response = await fabricLeaf.wrapAsset(asset);

    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.output).toBeDefined();

    log.info(`Wrap asset response: ${JSON.stringify(response)}`);

    const response2 = await fabricLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(1);
    expect(response2[0]).toBe(asset.id);

    const response3 = (await fabricLeaf.getAsset(
      asset.id,
    )) as FabricFungibleAsset;

    log.info(`GetAsset response: ${JSON.stringify(response3)}`);

    expect(response3).toBeDefined();
    expect(response3.id).toBe(asset.id);
    expect(response3.amount).toBe("0");
    expect(response3.owner).toBe(asset.owner);
    expect(response3.mspId).toBe(asset.mspId);
    expect(response3.type).toBe(asset.type);
    expect(response3.contractName).toBe(asset.contractName);
    expect(response3.channelName).toBe(asset.channelName);
  });

  it("Should Lock a token", async () => {
    const responseLock = await fabricLeaf.lockAsset(asset.id, 100);
    expect(responseLock).toBeDefined();
    expect(responseLock.transactionId).toBeDefined();
    expect(responseLock.output).toBeDefined();

    log.info(`Lock asset response: ${JSON.stringify(responseLock)}`);

    const response2 = (await fabricLeaf.getAsset(
      asset.id,
    )) as FabricFungibleAsset;

    expect(response2).not.toBeUndefined();
    expect(response2.id).toBe(asset.id);
    expect(response2.amount).toBe("100");
    expect(response2.owner).toBe(asset.owner);
    expect(response2.mspId).toBe(asset.mspId);
    expect(response2.type).toBe(asset.type);
    expect(response2.contractName).toBe(asset.contractName);
    expect(response2.channelName).toBe(asset.channelName);

    log.info(`GetAsset response: ${JSON.stringify(response2)}`);

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Bridge account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("Should Unlock a token", async () => {
    const responseUnlock = await fabricLeaf.unlockAsset(asset.id, 100);

    expect(responseUnlock).toBeDefined();
    expect(responseUnlock.transactionId).toBeDefined();
    expect(responseUnlock.output).toBeDefined();

    log.info(`Unlock asset response: ${JSON.stringify(responseUnlock)}`);

    const response = (await fabricLeaf.getAsset(
      asset.id,
    )) as FabricFungibleAsset;

    expect(response).not.toBeUndefined();
    expect(response.id).toBe(asset.id);
    expect(response.amount).toBe("0");
    expect(response.owner).toBe(asset.owner);
    expect(response.mspId).toBe(asset.mspId);
    expect(response.type).toBe(asset.type);
    expect(response.contractName).toBe(asset.contractName);
    expect(response.channelName).toBe(asset.channelName);
    log.info("Unlocked 100 tokens successfully");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");
  });

  it("Should Burn a token", async () => {
    await fabricEnv.approveAmount(
      fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
    );

    const responseLock = await fabricLeaf.lockAsset(asset.id, 100);

    expect(responseLock).toBeDefined();
    expect(responseLock.transactionId).toBeDefined();
    expect(responseLock.output).toBeDefined();
    log.info("Locked 100 tokens successfully");

    const responseBurn = await fabricLeaf.burnAsset(asset.id, 100);
    expect(responseBurn).toBeDefined();
    expect(responseBurn.transactionId).toBeDefined();
    expect(responseBurn.output).toBeDefined();
    log.info("Burned 100 tokens successfully");

    const response = (await fabricLeaf.getAsset(
      asset.id,
    )) as FabricFungibleAsset;
    expect(response).not.toBeUndefined();
    expect(response.id).toBe(asset.id);
    expect(response.amount).toBe("0");
    expect(response.owner).toBe(asset.owner);
    expect(response.mspId).toBe(asset.mspId);
    expect(response.type).toBe(asset.type);
    expect(response.contractName).toBe(asset.contractName);
    expect(response.channelName).toBe(asset.channelName);

    log.info(`GetAsset response: ${JSON.stringify(response)}`);

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was burned correctly from the Bridge account");
  });

  it("Should Mint a token", async () => {
    const responseMint = await fabricLeaf.mintAsset(asset.id, 100);
    expect(responseMint).toBeDefined();
    expect(responseMint.transactionId).toBeDefined();
    expect(responseMint.output).toBeDefined();

    log.info(`Mint asset response: ${JSON.stringify(responseMint)}`);

    const response = (await fabricLeaf.getAsset(
      asset.id,
    )) as FabricFungibleAsset;
    expect(response).not.toBeUndefined();
    expect(response.id).toBe(asset.id);
    expect(response.amount).toBe("100");
    expect(response.owner).toBe(asset.owner);
    expect(response.mspId).toBe(asset.mspId);
    expect(response.type).toBe(asset.type);
    expect(response.contractName).toBe(asset.contractName);
    expect(response.channelName).toBe(asset.channelName);
    log.info("Minted 100 tokens successfully");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was minted correctly to the Bridge account");
  });

  it("Should Assign a token", async () => {
    const responseAssign = await fabricLeaf.assignAsset(
      asset.id,
      asset.owner,
      100,
    );
    expect(responseAssign).toBeDefined();
    expect(responseAssign.transactionId).toBeDefined();
    expect(responseAssign.output).toBeDefined();

    log.info(`Assign asset response: ${JSON.stringify(responseAssign)}`);

    const response = (await fabricLeaf.getAsset(
      asset.id,
    )) as FabricFungibleAsset;
    expect(response).not.toBeUndefined();
    expect(response.id).toBe(asset.id);
    expect(response.amount).toBe("0");
    expect(response.owner).toBe(asset.owner);
    expect(response.mspId).toBe(asset.mspId);
    expect(response.type).toBe(asset.type);
    expect(response.contractName).toBe(asset.contractName);
    expect(response.channelName).toBe(asset.channelName);

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was burned correctly from the Bridge account");
    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was assigned correctly to the Owner account");
  });

  it("Should Unwrap a token", async () => {
    const responseUnwrap = await fabricLeaf.unwrapAsset(asset.id);
    expect(responseUnwrap).not.toBeUndefined();
    expect(responseUnwrap.transactionId).not.toBeUndefined();
    expect(responseUnwrap.output).not.toBeUndefined();

    log.info(`Unwrap asset response: ${JSON.stringify(responseUnwrap)}`);

    const response2 = await fabricLeaf.getAssets();
    expect(response2).toBeDefined();
    expect(response2.length).toBe(0);
    log.info("Unwrapped 100 tokens successfully");
  });
});
