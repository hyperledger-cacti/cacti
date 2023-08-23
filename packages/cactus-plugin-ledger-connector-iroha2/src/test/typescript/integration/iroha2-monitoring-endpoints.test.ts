/**
 * Tests for monitoring endpoints in Iroha V2 connector.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Log settings
const testLogLevel: LogLevelDesc = "info";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  Checks,
} from "@hyperledger/cactus-common";

import {
  IrohaInstruction,
  BlockTypeV1,
  WatchBlocksOptionsV1,
  WatchBlocksResponseV1,
  TransactionStatusV1,
} from "../../../main/typescript/public-api";
import {
  IrohaV2TestEnv,
  waitForCommit,
} from "../test-helpers/iroha2-env-setup";
import { addRandomSuffix } from "../test-helpers/utils";

import { VersionedCommittedBlock } from "@iroha2/data-model";
import "jest-extended";
import { computeTransactionHash } from "@iroha2/client";
import { bytesToHex } from "hada";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "monitoring-endpoints.test",
  level: testLogLevel,
});

/**
 * WatchBlocks test
 */
describe("Block monitoring tests", () => {
  let env: IrohaV2TestEnv;

  beforeAll(async () => {
    env = new IrohaV2TestEnv(log);
    await env.start();
  });

  afterAll(async () => {
    if (env) {
      await env.stop();
    }
  });

  /**
   * Common test template for checking watchBlocksV1 endpoint.
   * Sends watchBlocks request, creates new dummy domain to trigger block creation, calls onEvent
   * when block is received. Caller should define all assertion in onEvent and throw new exception
   * if test should fail.
   *
   * @param monitorOptions `apiClient.watchBlocksV1` argument.
   * @param onEvent callback with received block data to be checked.
   */
  async function testWatchBlocks(
    monitorOptions: WatchBlocksOptionsV1,
    onEvent: (event: WatchBlocksResponseV1) => void,
  ) {
    // Start monitoring
    const monitorPromise = new Promise<void>((resolve, reject) => {
      const watchObservable = env.apiClient.watchBlocksV1(monitorOptions);
      const subscription = watchObservable.subscribe({
        next(event) {
          try {
            onEvent(event);
            resolve();
          } catch (err) {
            log.error("watchBlocksV1() event check error:", err);
            reject(err);
          } finally {
            subscription.unsubscribe();
          }
        },
        error(err) {
          log.error("watchBlocksV1() error:", err);
          subscription.unsubscribe();
          reject(err);
        },
      });
    });

    // Wait for monitor setup just to be sure
    await waitForCommit();

    // Create new domain to trigger new block creation
    const domainName = addRandomSuffix("watchBlocksTest");
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      baseConfig: env.defaultBaseConfig,
    });
    log.info("Watch block trigger tx sent to create domain", domainName);
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Submitted,
    );

    await expect(monitorPromise).toResolve();
  }

  test("watchBlocksV1 reports new blocks in raw json (default) format", async () => {
    const monitorOptions = {
      type: BlockTypeV1.Raw,
      baseConfig: env.defaultBaseConfig,
    };

    const testPromise = testWatchBlocks(monitorOptions, (event) => {
      log.info("Received block event from the connector");
      if (!("blockData" in event)) {
        throw new Error("Unknown response type, wanted raw JSON data");
      }
      Checks.truthy(event.blockData);
      log.debug("block:", event.blockData);
      expect(event.blockData).toBeTruthy();
      const parsedBlock = JSON.parse(event.blockData).value;
      expect(parsedBlock).toBeTruthy();
      expect(parsedBlock.header).toBeTruthy();
      expect(parsedBlock.transactions).toBeDefined();
      expect(parsedBlock.rejected_transactions).toBeDefined();
      expect(parsedBlock.event_recommendations).toBeDefined();
    });

    await expect(testPromise).toResolve();
  });

  test("watchBlocksV1 reports new blocks in binary format", async () => {
    const monitorOptions = {
      type: BlockTypeV1.Binary,
      baseConfig: env.defaultBaseConfig,
    };

    const testPromise = testWatchBlocks(monitorOptions, (event) => {
      log.info("Received block event from the connector");
      if (!("binaryBlock" in event)) {
        throw new Error("Unknown response type, wanted binary data");
      }
      Checks.truthy(event.binaryBlock);
      const asBuffer = Buffer.from(event.binaryBlock, "base64");
      const decodedBlock = VersionedCommittedBlock.fromBuffer(asBuffer);
      log.debug("decodedBlock:", decodedBlock);
      expect(decodedBlock.as("V1").header).toBeTruthy();
    });

    await expect(testPromise).toResolve();
  });

  /**
   * Test shows parsing of block data to retrieve committed transactions that can be used to monitor submitted transaction status.
   */
  test("Watching for transaction hash in block content", async () => {
    // Will be filled later when the TX is sent.
    let searchedHash: string | undefined = undefined;

    // Start monitoring
    const monitorOptions = {
      type: BlockTypeV1.Binary,
      baseConfig: env.defaultBaseConfig,
    };

    const monitorPromise = new Promise<void>((resolve, reject) => {
      const watchObservable = env.apiClient.watchBlocksV1(monitorOptions);
      const subscription = watchObservable.subscribe({
        next(event) {
          try {
            // Process block data
            log.info("Received block event from the connector");
            if (!("binaryBlock" in event)) {
              throw new Error("Unknown response type, wanted binary data");
            }
            Checks.truthy(event.binaryBlock);
            const asBuffer = Buffer.from(event.binaryBlock, "base64");
            const decodedBlock = VersionedCommittedBlock.fromBuffer(asBuffer);
            decodedBlock.as("V1").transactions.forEach((tx) => {
              const txPayload = tx.as("V1").payload;
              const hashByes = computeTransactionHash(txPayload);
              const hashHex = bytesToHex([...hashByes]);
              log.debug("Received transaction", hashHex);
              if (hashHex === searchedHash) {
                log.info("Matching transaction found in block - resolve");
                subscription.unsubscribe();
                resolve();
              }
            });
          } catch (err) {
            log.error("watchBlocksV1() event check error:", err);
            subscription.unsubscribe();
            reject(err);
          }
        },
        error(err) {
          log.error("watchBlocksV1() error:", err);
          subscription.unsubscribe();
          reject(err);
        },
      });
    });

    // Wait for monitor setup just to be sure
    await waitForCommit();

    // Create new domain to trigger new block creation
    const domainName = addRandomSuffix("watchBlockContent");
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Submitted,
    );
    searchedHash = transactionResponse.data.hash;
    expect(searchedHash).toBeTruthy();
    log.info(
      `Search for transaction '${searchedHash}' in incoming block content...`,
    );

    await expect(monitorPromise).toResolve();
  });
});
