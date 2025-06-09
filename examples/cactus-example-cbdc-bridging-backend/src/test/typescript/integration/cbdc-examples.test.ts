import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { CbdcBridgingApp } from "../../../main/typescript";
import { ICbdcBridgingApp } from "../../../main/typescript/cbdc-bridging-app";
import { CbdcBridgingAppDummyInfrastructure } from "../../../main/typescript/infrastructure/cbdc-bridging-app-dummy-infrastructure";

const logLevel: LogLevelDesc = "DEBUG";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "CBDC-ESCROW-TEST",
});

let app: CbdcBridgingApp;
let infrastructure: CbdcBridgingAppDummyInfrastructure;

beforeAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  const options: ICbdcBridgingApp = {
    apiHost: "localhost",
    logLevel,
  };

  app = new CbdcBridgingApp(options);
  expect(app).toBeDefined();

  await app.start();
  infrastructure = app.infrastructure;

  log.info("CBDC Bridging App started successfully");
});

afterAll(async () => {
  await app?.stop();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("CBDC Escrow Scenarios", () => {
  const ALICE_USER = "Alice";
  const BOB_USER = "Charlie"; // Using Charlie as Bob since that's what's mapped in utils
  const ESCROW_AMOUNT = 500;
  const ASSET_REFERENCE_ID = "889242f8-58ae-449e-b938-fa28fdca65b6";

  beforeEach(async () => {
    log.info("Setting up test environment...");
  });

  test("Alice successfully escrows CBDC", async () => {
    const fabricEnvironment = infrastructure.getFabricEnvironment();
    const besuEnvironment = infrastructure.getBesuEnvironment();

    await fabricEnvironment.mintTokensFabric(
      ALICE_USER,
      ESCROW_AMOUNT.toString(),
    );

    log.info(`Asset reference ID: ${ASSET_REFERENCE_ID} (conceptual)`);

    const aliceInitialFabricBalance =
      await fabricEnvironment.getFabricBalance(ALICE_USER);
    expect(aliceInitialFabricBalance).toBe(ESCROW_AMOUNT);
    log.info(`Alice has ${aliceInitialFabricBalance} CBDC in Fabric sidechain`);

    const bobInitialBesuBalance =
      await besuEnvironment.getBesuBalance(BOB_USER);
    log.info(`Bob's initial Besu balance: ${bobInitialBesuBalance}`);

    await fabricEnvironment.approveNTokensFabric(
      ALICE_USER,
      ESCROW_AMOUNT.toString(),
    );
    log.info("Alice approved gateway to spend her tokens");

    const approvedAmount =
      await fabricEnvironment.getAmountApprovedFabric(ALICE_USER);
    expect(parseInt(approvedAmount)).toBe(ESCROW_AMOUNT);
    log.info(`Approved amount verified: ${approvedAmount}`);

    await infrastructure.bridgeTokens(
      ALICE_USER,
      BOB_USER,
      "FABRIC",
      "BESU",
      ESCROW_AMOUNT,
    );

    log.info("Bridge transaction initiated");

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const aliceFinalFabricBalance =
      await fabricEnvironment.getFabricBalance(ALICE_USER);
    expect(aliceFinalFabricBalance).toBe(0);
    log.info(
      `Alice now has ${aliceFinalFabricBalance} CBDC in Fabric sidechain`,
    );

    const bobFinalBesuBalance = await besuEnvironment.getBesuBalance(BOB_USER);
    expect(bobFinalBesuBalance).toBe(bobInitialBesuBalance + ESCROW_AMOUNT);
    log.info(`Bob now has ${bobFinalBesuBalance} CBDC in Besu mainchain`);
  });
});
