/**
 * Tests of Iroha V2 helper typescript setup class.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const containerImageName = "ghcr.io/hyperledger/cactus-iroha2-all-in-one";
const containerImageVersion = "2023-07-29-f2bc772ee";
const useRunningLedger = false;

// Log settings
const testLogLevel: LogLevelDesc = "info";

import {
  Iroha2TestLedger,
  pruneDockerAllIfGithubAction,
  IROHA2_TEST_LEDGER_DEFAULT_OPTIONS,
} from "../../../../../main/typescript/index";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import "jest-extended";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "iroha2-test-ledger.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Iroha V2 Test Ledger checks", () => {
  let ledger: Iroha2TestLedger;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start Iroha2TestLedger...");
    ledger = new Iroha2TestLedger({
      containerImageName,
      containerImageVersion,
      useRunningLedger,
      emitContainerLogs: false,
      logLevel: testLogLevel,
    });
    log.debug("IrohaV2 image:", ledger.fullContainerImageName);
    expect(ledger).toBeTruthy();

    await ledger.start();
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (ledger) {
      log.info("Stop the iroha2 ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Check if started container is still healthy.
   */
  test("Started container is healthy", async () => {
    const status = await ledger.getContainerStatus();
    expect(status).toEndWith("(healthy)");
  });

  /**
   * Check handling of default constructor options.
   */
  test("Starting without options sets default values correctly", async () => {
    const defaultLedger = new Iroha2TestLedger();

    expect(defaultLedger.containerImageName).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.containerImageName,
    );
    expect(defaultLedger.containerImageVersion).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.containerImageVersion,
    );
    expect(defaultLedger.logLevel).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.logLevel,
    );
    expect(defaultLedger.emitContainerLogs).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.emitContainerLogs,
    );
    expect(defaultLedger.envVars).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.envVars,
    );
    expect(defaultLedger.useRunningLedger).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.useRunningLedger,
    );
  });

  /**
   * Check handling of default boolean constructor options.
   */
  test("Constructor handles default boolean values correctly", async () => {
    // true flags
    const trueOptsLedger = new Iroha2TestLedger({
      emitContainerLogs: true,
      useRunningLedger: true,
    });
    expect(trueOptsLedger.emitContainerLogs).toEqual(true);
    expect(trueOptsLedger.useRunningLedger).toEqual(true);

    // false flags
    const falseOptsLedger = new Iroha2TestLedger({
      emitContainerLogs: false,
      useRunningLedger: false,
    });
    expect(falseOptsLedger.emitContainerLogs).toEqual(false);
    expect(falseOptsLedger.useRunningLedger).toEqual(false);

    // undefined flags
    const undefinedOptsLedger = new Iroha2TestLedger({
      emitContainerLogs: undefined,
      useRunningLedger: undefined,
    });
    expect(undefinedOptsLedger.emitContainerLogs).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.emitContainerLogs,
    );
    expect(undefinedOptsLedger.useRunningLedger).toEqual(
      IROHA2_TEST_LEDGER_DEFAULT_OPTIONS.useRunningLedger,
    );
  });

  /**
   * Check response of `getClientConfig()`
   */
  test("getClientConfig returns correct data", async () => {
    const config = await ledger.getClientConfig();
    log.info("Received client config:", JSON.stringify(config));
    expect(config).toBeTruthy();
    expect(config.PUBLIC_KEY).toBeTruthy();
    expect(config.PRIVATE_KEY.digest_function).toBeTruthy();
    expect(config.PRIVATE_KEY.payload).toBeTruthy();
    expect(config.ACCOUNT_ID).toBeTruthy();
    expect(config.BASIC_AUTH.web_login).toBeTruthy();
    expect(config.BASIC_AUTH.password).toBeTruthy();
    expect(config.TORII_API_URL).toBeTruthy();
    expect(config.TORII_TELEMETRY_URL).toBeTruthy();
    expect(config.TRANSACTION_TIME_TO_LIVE_MS).toBeDefined();
    expect(config.TRANSACTION_STATUS_TIMEOUT_MS).toBeDefined();
    expect(config.TRANSACTION_LIMITS.max_instruction_number).toBeDefined();
    expect(config.TRANSACTION_LIMITS.max_wasm_size_bytes).toBeDefined();
    expect(config.ADD_TRANSACTION_NONCE).toBeDefined();
  });
});
