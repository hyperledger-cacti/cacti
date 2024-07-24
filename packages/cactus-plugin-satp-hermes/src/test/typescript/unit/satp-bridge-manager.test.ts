import "jest-extended";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";

import { SATPBridgeConfig } from "../../../main/typescript/core/types";
import { SatpBridgeManager } from "../../../main/typescript/core/stage-services/satp-bridge/satp-bridge-manager";
import { NetworkBridge } from "../../../main/typescript/core/stage-services/satp-bridge/network-bridge";
import {
  Asset,
  TokenType,
} from "../../../main/typescript/core/stage-services/satp-bridge/types/asset";

const logLevel: LogLevelDesc = "DEBUG";
const logger = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "satp-bridge-manager-test",
});

let network: NetworkBridge;

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  network = {
    runTransaction: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
    getReceipt: jest.fn().mockReturnValue("testReceipt"),
    network: "testNetwork",
    networkName: function (): string {
      return this.network;
    },
    wrapAsset: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
    unwrapAsset: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
    lockAsset: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
    unlockAsset: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
    mintAsset: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
    burnAsset: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
    assignAsset: jest.fn().mockReturnValue({
      transactionId: "testTransaction",
      output: "testOutput",
    }),
  };
});

describe("SATP bridge function testing", () => {
  test("Lock asset function works", async () => {
    const bridgeConfig: SATPBridgeConfig = { network };

    const bridgeManager = new SatpBridgeManager(bridgeConfig);
    const assetId = "testAssetId";
    const receipt = await bridgeManager.lockAsset(assetId, 2);
    expect(receipt).toBeDefined();
  });
  test("Unlock asset function  works", async () => {
    const bridgeConfig: SATPBridgeConfig = { network };
    const bridgeManager = new SatpBridgeManager(bridgeConfig);
    const assetId = "testAssetId";
    const receipt = await bridgeManager.unlockAsset(assetId, 2);
    expect(receipt).toBeDefined();
  });
  test("Mint asset function works", async () => {
    const bridgeConfig: SATPBridgeConfig = { network };
    const bridgeManager = new SatpBridgeManager(bridgeConfig);
    const assetId = "testAssetId";
    const receipt = await bridgeManager.mintAsset(assetId, 2);
    expect(receipt).toBeDefined();
  });
  test("Burn asset function works", async () => {
    const bridgeConfig: SATPBridgeConfig = { network };
    const bridgeManager = new SatpBridgeManager(bridgeConfig);
    const assetId = "testAssetId";
    const receipt = await bridgeManager.burnAsset(assetId, 2);
    expect(receipt).toBeDefined();
  });
  test("Assign asset function works", async () => {
    const bridgeConfig: SATPBridgeConfig = { network };
    const bridgeManager = new SatpBridgeManager(bridgeConfig);
    const assetId = "testAssetId";
    const recipient = "testRecipient";
    const receipt = await bridgeManager.assignAsset(assetId, recipient, 2);
    expect(receipt).toBeDefined();
  });
  test("Verify wrap asset function works", async () => {
    const bridgeConfig: SATPBridgeConfig = { network };
    const bridgeManager = new SatpBridgeManager(bridgeConfig);
    const asset: Asset = {
      tokenId: "testAssetId",
      tokenType: TokenType.ERC20,
      owner: "testOwner",
      amount: 0,
      ontology: "",
    };
    const receipt = await bridgeManager.wrapAsset(asset);
    expect(receipt).toBeDefined();
  });

  test("Verify unwrap asset function works", async () => {
    const bridgeConfig: SATPBridgeConfig = { network };
    const bridgeManager = new SatpBridgeManager(bridgeConfig);
    const assetId = "testAssetId";
    const receipt = await bridgeManager.unwrapAsset(assetId);
    expect(receipt).toBeDefined();
  });
});

afterAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
