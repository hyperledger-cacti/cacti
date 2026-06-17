import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerContainersIfGithubAction,
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
import { EvmMultiTokenAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import {
  Amount,
  UniqueTokenID,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/asset";
import { SupportedContractTypes } from "../../environments/ethereum-test-environment";

// ERC-6909 token type IDs used across all tests in this suite
const TOKEN_TYPE_A = 42 as UniqueTokenID;
const TOKEN_TYPE_B = 99 as UniqueTokenID;

let ontologyManager: OntologyManager;
let multiTokenAsset: EvmMultiTokenAsset;

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - ERC6909 Hermes",
});

let ethereumLeaf: EthereumLeaf;
let ethereumEnv: EthereumTestEnvironment;
const TIMEOUT = 60000;

beforeAll(async () => {
  await pruneDockerContainersIfGithubAction({ logLevel })
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
        ontologiesPath,
      },
      monitorService,
    );

    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      { logLevel },
      [
        {
          assetType: SupportedContractTypes.MULTITOKEN,
          contractName: "SATMultiToken",
        },
      ],
    );
    log.info("Ethereum Ledger started successfully");

    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);

    // Mint 200 tokens of TOKEN_TYPE_A to the whale account.
    // The deployer automatically holds BRIDGE_ROLE on SATMultiTokenContract
    // so the mint call goes through without an explicit role grant.
    await ethereumEnv.mintMultiTokens("200", Number(TOKEN_TYPE_A));
  }
}, TIMEOUT);

afterAll(async () => {
  if (ethereumEnv) {
    await ethereumEnv.tearDown();
  }
  if (ethereumLeaf) {
    await ethereumLeaf.shutdownConnection().catch((err) => {
      log.error("Error shutting down Ethereum Leaf connector:", err);
    });
  }
  await monitorService.shutdown();
  log.info("ERC6909 Ethereum Leaf test teardown complete");

  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

describe("ERC6909 Multi-Token Ethereum Leaf Test", () => {
  jest.setTimeout(20000);

  it("Should Initialize the Leaf", async () => {
    ethereumLeaf = new EthereumLeaf(
      ethereumEnv.createEthereumLeafConfig(ontologyManager, logLevel),
      ontologyManager,
      monitorService,
    );
    expect(ethereumLeaf).toBeDefined();
  });

  it("Should deploy Wrapper Smart Contract", async () => {
    await ethereumLeaf.deployContracts();
    expect(ethereumLeaf.getDeployWrapperContractReceipt()).toBeDefined();
  });

  it("Should return the wrapper contract address and grant BRIDGE_ROLE", async () => {
    const wrapperContractAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );
    expect(wrapperContractAddress).toBeDefined();

    // Grant BRIDGE_ROLE on SATMultiTokenContract so the wrapper can call
    // lock / unlock / mint / burn / assign on behalf of the bridge.
    await ethereumEnv.giveRoleToBridge(wrapperContractAddress);
  });

  it("Should Wrap a multi-token (ERC-6909) asset", async () => {
    multiTokenAsset = {
      id: ethereumEnv.multiTokenDefaultAsset.id,
      referenceId: EthereumTestEnvironment.ERC6909_REFERENCE_ID,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      owner: WHALE_ACCOUNT_ADDRESS,
      contractName: ethereumEnv.multiTokenDefaultAsset.contractName,
      contractAddress: ethereumEnv.getTestMultiTokenContractAddress(),
      amount: Number(100) as Amount,
      uniqueDescriptor: TOKEN_TYPE_A,
      network: {
        id: EthereumTestEnvironment.ETH_NETWORK_ID,
        ledgerType: LedgerType.Ethereum,
      },
      ercTokenStandard: ERCTokenStandard.ERC_TOKEN_STANDARD_ERC6909,
    } as EvmMultiTokenAsset;

    const response = await ethereumLeaf.wrapAsset(multiTokenAsset);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const assets = await ethereumLeaf.getAssets();
    expect(assets).toBeDefined();
    expect(assets.length).toBe(1);
    expect(assets[0]).toBe(multiTokenAsset.id);
    log.info("ERC-6909 multi-token asset wrapped successfully");
  });

  it("Should Lock multi-token type A (100 units)", async () => {
    const response = await ethereumLeaf.lockAsset(
      multiTokenAsset.id,
      100 as Amount,
      TOKEN_TYPE_A,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Locked 100 units of TOKEN_TYPE_A successfully");

    const wrapperAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );

    // Wrapper now holds 100 units of type A; owner has (200 minted - 100 locked) = 100
    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      wrapperAddress,
      Number(TOKEN_TYPE_A),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      WHALE_ACCOUNT_ADDRESS,
      Number(TOKEN_TYPE_A),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
  });

  it("Should Unlock multi-token type A (100 units)", async () => {
    const response = await ethereumLeaf.unlockAsset(
      multiTokenAsset.id,
      100 as Amount,
      TOKEN_TYPE_A,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Unlocked 100 units of TOKEN_TYPE_A successfully");

    const wrapperAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );

    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      wrapperAddress,
      Number(TOKEN_TYPE_A),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      WHALE_ACCOUNT_ADDRESS,
      Number(TOKEN_TYPE_A),
      "200",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
  });

  it("Should Burn multi-token type A (lock then burn)", async () => {
    // Re-lock 100 units before burning
    const lockRes = await ethereumLeaf.lockAsset(
      multiTokenAsset.id,
      100 as Amount,
      TOKEN_TYPE_A,
    );
    expect(lockRes.transactionId).toBeDefined();
    log.info("Re-locked 100 units of TOKEN_TYPE_A before burn");

    const burnRes = await ethereumLeaf.burnAsset(
      multiTokenAsset.id,
      100 as Amount,
      TOKEN_TYPE_A,
    );
    expect(burnRes).toBeDefined();
    expect(burnRes.transactionId).toBeDefined();
    expect(burnRes.transactionReceipt).toBeDefined();
    log.info("Burned 100 units of TOKEN_TYPE_A successfully");

    const wrapperAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );
    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      wrapperAddress,
      Number(TOKEN_TYPE_A),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
  });

  it("Should Mint multi-token type B into wrapper", async () => {
    // Mint 50 units of type B directly into the wrapper (destination-side operation)
    const response = await ethereumLeaf.mintAsset(
      multiTokenAsset.id,
      50 as Amount,
      TOKEN_TYPE_B,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Minted 50 units of TOKEN_TYPE_B into wrapper successfully");

    const wrapperAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );
    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      wrapperAddress,
      Number(TOKEN_TYPE_B),
      "50",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
  });

  it("Should Assign multi-token type B to owner", async () => {
    const response = await ethereumLeaf.assignAsset(
      multiTokenAsset.id,
      WHALE_ACCOUNT_ADDRESS,
      50 as Amount,
      TOKEN_TYPE_B,
    );
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();
    log.info("Assigned 50 units of TOKEN_TYPE_B to owner successfully");

    const wrapperAddress = await ethereumLeaf.getWrapperContract(
      TokenType.NONSTANDARD_FUNGIBLE,
    );
    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      wrapperAddress,
      Number(TOKEN_TYPE_B),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    await ethereumEnv.checkMultiTokenBalance(
      ethereumEnv.getTestMultiTokenContractAddress(),
      WHALE_ACCOUNT_ADDRESS,
      Number(TOKEN_TYPE_B),
      "50",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
  });

  it("Should Unwrap multi-token asset", async () => {
    const response = await ethereumLeaf.unwrapAsset(multiTokenAsset.id);
    expect(response).toBeDefined();
    expect(response.transactionId).toBeDefined();
    expect(response.transactionReceipt).toBeDefined();

    const assets = await ethereumLeaf.getAssets();
    expect(assets).toBeDefined();
    expect(assets.length).toBe(0);
    log.info("ERC-6909 multi-token asset unwrapped successfully");
  });
});
